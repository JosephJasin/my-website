import {z} from 'zod';
import {machines} from '../client/equipment';
import {familyFor} from '../client/exercise-families';
import {defaultWorkoutSettings,eligible,isNew,nextTemplate,optionFor,planById,prepareSlots,type Learning,type Option,type SessionSlot,type WorkoutSession,type WorkoutSettings,type WorkoutState} from '../client/workout-model';
import {json} from './progress';

const ddl=[
 'CREATE TABLE IF NOT EXISTS workout_settings (user_id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS workout_sessions (user_id TEXT NOT NULL, id TEXT NOT NULL, plan_id TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, PRIMARY KEY(user_id,id))',
 "CREATE UNIQUE INDEX IF NOT EXISTS one_active_workout ON workout_sessions(user_id) WHERE status='active'",
 'CREATE TABLE IF NOT EXISTS watch_receipts (user_id TEXT NOT NULL, device_id TEXT NOT NULL, operation_id TEXT NOT NULL, body_hash TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(user_id,device_id,operation_id))',
 "CREATE TRIGGER IF NOT EXISTS learning_blocks_workout BEFORE INSERT ON workout_sessions WHEN NEW.status='active' AND EXISTS(SELECT 1 FROM visits WHERE user_id=NEW.user_id AND finished_at IS NULL) BEGIN SELECT RAISE(IGNORE); END",
 "CREATE TRIGGER IF NOT EXISTS workout_blocks_learning BEFORE INSERT ON visits WHEN NEW.finished_at IS NULL AND EXISTS(SELECT 1 FROM workout_sessions WHERE user_id=NEW.user_id AND status='active') BEGIN SELECT RAISE(IGNORE); END",

];
const ready=new WeakMap<D1Database,Promise<unknown>>();
export async function ensureWorkoutTables(db:D1Database){
 if(!ready.has(db))ready.set(db,db.batch(ddl.map(sql=>db.prepare(sql))).catch(e=>{ready.delete(db);throw e}));
 await ready.get(db);
}
const planId=z.string().refine(id=>!!planById(id));
const settingsSchema=z.object({planId,choices:z.record(z.string().max(150)).refine(x=>Object.keys(x).length<=500)}).strict();
const logSchema=z.object({reps:z.string().max(12),load:z.string().max(40),done:z.boolean()}).strict();
const optionSchema=z.object({id:z.string().max(150),label:z.string().max(250),guideId:z.string().refine(id=>machines.some(m=>m.id===id)).optional()}).strict();
const slotSchema=z.object({id:z.string().max(100),label:z.string().max(250),bodypart:z.string().max(100),sets:z.number().int().min(1).max(10),reps:z.string().max(200),options:z.array(optionSchema).max(30),optional:z.boolean().optional(),originalLine:z.string().max(1500).optional(),unit:z.enum(['reps','minutes']).optional(),option:optionSchema.nullable(),learning:z.boolean(),skipped:z.boolean(),skipReason:z.string().max(200),logs:z.array(logSchema).min(1).max(10)}).strict();
const sessionSchema=z.object({id:z.string().uuid(),planId,title:z.string().max(200),templateId:z.string().max(100),startedAt:z.string().datetime(),finishedAt:z.string().datetime().nullable(),status:z.enum(['active','finished','abandoned']),revision:z.number().int().nonnegative(),learningLimit:z.number().int().min(1).max(2),slots:z.array(slotSchema).max(20),notes:z.string().max(1200),custom:z.boolean(),introductory:z.boolean()}).strict().refine(s=>(s.status==='active')===(s.finishedAt===null));
const backupSchema=z.object({format:z.literal('firstrep-workouts'),version:z.literal(1),settings:settingsSchema,sessions:z.array(sessionSchema).max(3000)}).strict().refine(b=>b.sessions.filter(s=>s.status==='active').length<=1&&new Set(b.sessions.map(s=>s.id)).size===b.sessions.length);
const command=z.discriminatedUnion('type',[
 z.object({type:z.literal('settings'),revision:z.number().int().nonnegative(),planId:planId.optional(),choice:z.object({key:z.string(),optionId:z.string()}).strict().optional()}).strict(),
 z.object({type:z.literal('start'),id:z.string().uuid(),settingsRevision:z.number().int().nonnegative(),optional:z.boolean().optional()}).strict(),
 z.object({type:z.literal('set'),id:z.string().uuid(),revision:z.number().int().nonnegative(),slotId:z.string(),index:z.number().int().nonnegative(),log:logSchema}).strict(),
 z.object({type:z.literal('swap'),id:z.string().uuid(),revision:z.number().int().nonnegative(),slotId:z.string(),optionId:z.string()}).strict(),
 z.object({type:z.literal('skip'),id:z.string().uuid(),revision:z.number().int().nonnegative(),slotId:z.string(),skipped:z.boolean()}).strict(),
 z.object({type:z.literal('finish'),id:z.string().uuid(),revision:z.number().int().nonnegative(),abandon:z.boolean().optional(),notes:z.string().max(1200).optional()}).strict(),
 z.object({type:z.literal('import'),backup:backupSchema}).strict(),
]);
function requestAllowed(request:Request,type:string){return request.headers.get('origin')===new URL(request.url).origin&&request.headers.get('content-type')?.toLowerCase().startsWith(type)}
const conflict=()=>json({error:'This workout changed on another device. Refresh and try your change again.'},409);
function starterSelectionError(session:WorkoutSession,slot:SessionSlot,option:Option,learning:Learning,learningNow:boolean){
 if(!eligible(option,learning))return 'Mark this setup found and resolve any “Need help” status first.';
 // A skipped exercise still counts if its practice set was already completed.
 const others=session.slots.filter(x=>x.id!==slot.id&&x.option&&(!x.skipped||x.logs.some(l=>l.done)));
 if(others.some(x=>x.option?.guideId===option.guideId))return 'That exercise is already in this session.';
 if(learningNow&&others.filter(x=>x.learning).length>=session.learningLimit)return 'This would exceed your new-guide limit. Choose a learned alternative or save it for another visit.';
 return null;
}

export function workoutService(db:D1Database,getLearning:(userId:string)=>Promise<{machines:Learning;preferences:{pace:number};visits?:{finishedAt:string|null}[]}> ) {
 async function state(userId:string):Promise<WorkoutState>{
  await db.prepare('INSERT OR IGNORE INTO workout_settings(user_id,revision,data) VALUES(?,0,?)').bind(userId,JSON.stringify(defaultWorkoutSettings)).run();
  const [settings,history]=await Promise.all([
   db.prepare('SELECT revision,data FROM workout_settings WHERE user_id=?').bind(userId).first<{revision:number;data:string}>(),
   db.prepare('SELECT revision,data FROM workout_sessions WHERE user_id=? ORDER BY started_at DESC,id DESC').bind(userId).all<{revision:number;data:string}>(),
  ]);
  return {settings:JSON.parse(settings!.data),settingsRevision:settings!.revision,sessions:history.results.map(r=>({...JSON.parse(r.data),revision:r.revision}))};
 }
 async function handle(request:Request,userId:string,receipt?:{deviceId:string;operationId:string;bodyHash:string}):Promise<Response>{
  try{
   await ensureWorkoutTables(db);
   const url=new URL(request.url);
   if(request.method==='GET'){
    const data=await state(userId);
    if(url.pathname.endsWith('/export'))return new Response(JSON.stringify({format:'firstrep-workouts',version:1,settings:data.settings,sessions:data.sessions},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="firstrep-workouts.json"','Cache-Control':'private, no-store'}});
    return json(data);
   }
   if(request.method!=='POST'||url.pathname.endsWith('/export'))return json({error:'Method not allowed.'},405);
   if(!requestAllowed(request,'application/json'))return json({error:'Invalid request origin or content type.'},403);
   if(Number(request.headers.get('content-length'))>8_000_000)return json({error:'Request too large.'},413);
   const body=await request.text();if(body.length>8_000_000)return json({error:'Request too large.'},413);
   let parsed;try{parsed=command.safeParse(JSON.parse(body))}catch{return json({error:'Invalid JSON.'},400)}
   if(!parsed.success)return json({error:'Please check your workout entries.'},400);
   const c=parsed.data;
   // The native gateway supplies this context after authenticating a paired device.
   // A receipt and its write commit in one D1 transaction, so lost responses are safe to retry.
   const savedReceipt=async()=>receipt?await db.prepare('SELECT body_hash FROM watch_receipts WHERE user_id=? AND device_id=? AND operation_id=?').bind(userId,receipt.deviceId,receipt.operationId).first<{body_hash:string}>():null;
   if(receipt){
    if(!['start','set','skip','finish','swap'].includes(c.type))return json({error:'Unsupported watch action.'},403);
    const saved=await savedReceipt();
    if(saved)return saved.body_hash===receipt.bodyHash?json(await state(userId)):json({error:'Operation identifier was reused.'},409);
   }
   const s=await state(userId),now=new Date().toISOString();
   if(c.type==='settings'){
    if(c.revision!==s.settingsRevision)return conflict();
    const next:WorkoutSettings={...s.settings,choices:{...s.settings.choices}};
    if(c.planId)next.planId=c.planId;
    if(c.choice){
     const [p,t,id]=c.choice.key.split(':');const slot=planById(p)?.templates.find(x=>x.id===t)?.slots.find(x=>x.id===id);
     if(!slot||!slot.options.some(o=>o.id===c.choice!.optionId)&&c.choice.optionId!=='')return json({error:'Unknown exercise choice.'},400);
     if(c.choice.optionId)next.choices[c.choice.key]=c.choice.optionId;else delete next.choices[c.choice.key];
    }
    const r=await db.prepare('UPDATE workout_settings SET data=?,revision=revision+1 WHERE user_id=? AND revision=?').bind(JSON.stringify(next),userId,c.revision).run();
    if(!r.meta.changes)return conflict();
   }else if(c.type==='start'){
    if(s.sessions.some(w=>w.status==='active')||s.sessions.some(w=>w.id===c.id))return json(s);
    if(c.settingsRevision!==s.settingsRevision)return conflict();
    const learning=await getLearning(userId),plan=planById(s.settings.planId)!;
    if(learning.visits?.some(v=>!v.finishedAt))return json({error:'Finish your active equipment-learning visit first.'},409);
    if(c.optional&&plan.id!=='starter')return json({error:'Optional cardio belongs to First Rep Starter.'},400);
    const template=c.optional?plan.templates.find(t=>t.id==='OPTIONAL')!:nextTemplate(plan,s.sessions);
    const slots=prepareSlots(plan,template,s.settings,learning.machines,learning.preferences.pace);
    if(!slots.some(x=>!x.skipped&&x.option))return json({error:'Confirm a suitable setup in an equipment guide first.'},409);
    const session:WorkoutSession={id:c.id,planId:plan.id,title:template.title,templateId:template.id,startedAt:now,finishedAt:null,status:'active',revision:0,learningLimit:learning.preferences.pace,slots,notes:'',custom:false,introductory:plan.id==='starter'&&slots.some(x=>!x.optional&&(x.skipped||x.learning))};
    const result=await db.prepare('INSERT OR IGNORE INTO workout_sessions(user_id,id,plan_id,status,started_at,revision,data) SELECT ?,?,?,?,?,0,? WHERE EXISTS(SELECT 1 FROM workout_settings WHERE user_id=? AND revision=?)').bind(userId,c.id,plan.id,'active',now,JSON.stringify(session),userId,c.settingsRevision).run();
    if(!result.meta.changes&&!(await state(userId)).sessions.some(w=>w.status==='active'))return conflict();
   }else if(c.type==='import'){
    const batch=c.backup.sessions.map(w=>db.prepare('INSERT OR IGNORE INTO workout_sessions(user_id,id,plan_id,status,started_at,revision,data) VALUES(?,?,?,?,?,?,?)').bind(userId,w.id,w.planId,w.status,w.startedAt,w.revision,JSON.stringify(w)));
    // Existing preferences and sessions win. Restore preferences only for an untouched account.
    batch.unshift(db.prepare('UPDATE workout_settings SET data=?,revision=revision+1 WHERE user_id=? AND revision=0').bind(JSON.stringify(c.backup.settings),userId));
    for(let i=0;i<batch.length;i+=50)await db.batch(batch.slice(i,i+50));
   }else{
    const session=s.sessions.find(w=>w.id===c.id);
    if(!session)return json({error:'Workout not found.'},404);
    if(session.status!=='active'||session.revision!==c.revision)return conflict();
    if(c.type==='finish'){
     const hasLoggedSets=session.slots.some(x=>x.logs.some(l=>l.done));
     if(!c.abandon&&!hasLoggedSets)return json({error:'Log at least one set, or discard this empty workout.'},400);
     if(c.abandon&&hasLoggedSets)return json({error:'This workout has logged sets. Finish and save it to keep your record.'},400);
     session.status=c.abandon?'abandoned':'finished';session.finishedAt=now;session.notes=c.notes||'';
    }else{
     const slot=session.slots.find(x=>x.id===c.slotId);if(!slot)return json({error:'Exercise not found.'},400);
     if(c.type==='set'){
      if(slot.skipped||!slot.option||c.index>=slot.logs.length)return json({error:'This set is unavailable.'},400);
      if(c.log.done&&(!/^\d+(\.\d+)?$/.test(c.log.reps)||Number(c.log.reps)<=0||Number(c.log.reps)>1000))return json({error:'Enter the actual repetitions or minutes before completing a set.'},400);
      slot.logs[c.index]=c.log;
     }
     if(c.type==='skip'){
      if(!c.skipped&&!slot.option)return json({error:'Choose a suitable exercise first.'},400);
      if(!c.skipped&&slot.option&&session.planId==='starter'){
       const learning=await getLearning(userId);
       const issue=starterSelectionError(session,slot,slot.option,learning.machines,slot.learning);
       if(issue)return json({error:issue},409);
      }
      slot.skipped=c.skipped;slot.skipReason=c.skipped?(slot.logs.some(l=>l.done)?'Remaining sets skipped. Logged sets are kept.':'Skipped this visit'):'';
     }
     if(c.type==='swap'){
      if(slot.logs.some(l=>l.done))return json({error:'This exercise already has completed sets. Keep its record and choose another variant next visit.'},409);
      let option=slot.options.find(o=>o.id===c.optionId);
      if(!option&&c.optionId.startsWith('guide:')){
       const guideId=c.optionId.slice(6),family=familyFor(guideId);
       if(family&&slot.options.some(o=>o.guideId&&family.ids.includes(o.guideId))){option=optionFor(guideId);session.custom=true;}
      }
      if(!option)return json({error:'Choose a listed alternative for this movement.'},400);
      const learning=await getLearning(userId);
      if(session.planId==='starter'){
       const issue=starterSelectionError(session,slot,option,learning.machines,isNew(option,learning.machines));
       if(issue)return json({error:issue},409);
      }
      slot.option=option;slot.learning=isNew(option,learning.machines);slot.skipped=false;slot.skipReason='';
      slot.logs=Array.from({length:session.planId==='starter'&&slot.learning?1:slot.sets},()=>({reps:'',load:'',done:false}));
      if(session.planId==='starter'&&slot.learning)session.introductory=true;
     }
    }
    const update=db.prepare('UPDATE workout_sessions SET data=?,status=?,revision=revision+1 WHERE user_id=? AND id=? AND revision=? AND status=\'active\'').bind(JSON.stringify(session),session.status,userId,c.id,c.revision);
    const r=receipt?(await db.batch([update,db.prepare('INSERT INTO watch_receipts(user_id,device_id,operation_id,body_hash,created_at) SELECT ?,?,?,?,? WHERE changes()>0').bind(userId,receipt.deviceId,receipt.operationId,receipt.bodyHash,Date.now())]))[0]:await update.run();
    if(!r.meta.changes){const saved=await savedReceipt();if(!saved||saved.body_hash!==receipt?.bodyHash)return conflict();}
   }
   return json(await state(userId));
  }catch{return json({error:'Your workout could not be saved or loaded. Please retry.'},503)}
 }
 return {state,handle};
}
