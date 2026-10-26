import {z} from 'zod';
import {json} from './progress';
import {ensureWorkoutTables,workoutService} from './workouts';
import {nextTemplate,planById,prepareSlots,type Learning,type WorkoutState} from '../client/workout-model';

export const watchPrefix='/firstrep-watch-api/';
const ready=new WeakMap<D1Database,Promise<unknown>>();
const minute=60_000,day=86_400_000;
type Device={id:string;user_id:string|null;name:string;expires_at:number;created_at:number;last_seen:number|null};
type LearningState={machines:Learning;preferences:{pace:number};visits?:{finishedAt:string|null}[]};
const pairSchema=z.object({name:z.string().trim().min(1).max(60)}).strict();
const management=z.discriminatedUnion('type',[
 z.object({type:z.literal('approve'),code:z.string().regex(/^[A-Z2-9]{8}$/)}).strict(),
 z.object({type:z.literal('revoke'),id:z.string().uuid()}).strict(),
]);
const envelope=z.object({operationId:z.string().uuid(),command:z.record(z.unknown())}).strict();
const hash=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const random=(bytes:number)=>Array.from(crypto.getRandomValues(new Uint8Array(bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export async function ensureWatchTables(db:D1Database){
 if(!ready.has(db))ready.set(db,db.batch([
  db.prepare('CREATE TABLE IF NOT EXISTS watch_devices (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, code_hash TEXT UNIQUE, user_id TEXT, name TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, last_seen INTEGER)'),
  db.prepare('CREATE TABLE IF NOT EXISTS watch_pair_limits (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL)'),
 ]).catch(e=>{ready.delete(db);throw e}));
 await ready.get(db);await ensureWorkoutTables(db);
}
async function body(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error('Use JSON.');
 if(Number(request.headers.get('content-length'))>8_000)throw Error('Request too large.');
 const reader=request.body?.getReader();if(!reader)throw Error('Missing body.');
 const chunks:Uint8Array[]=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>8_000){await reader.cancel();throw Error('Request too large.')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 return JSON.parse(new TextDecoder().decode(bytes));
}

export function watchService(db:D1Database,getLearning:(id:string)=>Promise<LearningState>){
 const workouts=workoutService(db,getLearning);
 async function snapshot(userId:string){
  const state=await workouts.state(userId),learning=await getLearning(userId),plan=planById(state.settings.planId)!;
  const active=state.sessions.find(s=>s.status==='active')||null,template=nextTemplate(plan,state.sessions);
  // Only workout execution data crosses this API: no account, profile, backup or free-form notes.
  const clean=(s:WorkoutState['sessions'][number])=>({...s,notes:''});
  const previous:Record<string,{reps:string;load:string}>={};
  for(const session of state.sessions.filter(s=>s.status==='finished'))for(const slot of session.slots){
   const key=slot.option?.guideId||slot.option?.id,log=[...slot.logs].reverse().find(l=>l.done);
   if(key&&log&&!previous[key])previous[key]={reps:log.reps,load:log.load};
  }
  return {protocol:1,planName:plan.name,settingsRevision:state.settingsRevision,active:active?clean(active):null,
   next:{title:template.title,slots:prepareSlots(plan,template,state.settings,learning.machines,learning.preferences.pace)},
   previous,serverTime:new Date().toISOString()};
 }
 async function owner(request:Request,userId:string){
  try{
   await ensureWatchTables(db);
   if(request.method==='POST'){
    if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
    let parsed;try{parsed=management.safeParse(await body(request))}catch{return json({error:'Invalid request.'},400)}
    if(!parsed.success)return json({error:'Check the eight-character watch code.'},400);
    if(parsed.data.type==='approve'){
     const codeHash=await hash(parsed.data.code);
     const r=await db.prepare('UPDATE watch_devices SET user_id=?,code_hash=NULL,expires_at=? WHERE code_hash=? AND user_id IS NULL AND expires_at>?').bind(userId,Date.now()+90*day,codeHash,Date.now()).run();
     if(!r.meta.changes)return json({error:'That code expired or was already used. Get a new code on your watch.'},404);
    }else await db.prepare('DELETE FROM watch_devices WHERE id=? AND user_id=?').bind(parsed.data.id,userId).run();
   }else if(request.method!=='GET')return json({error:'Method not allowed.'},405);
   const devices=await db.prepare('SELECT id,name,created_at,expires_at,last_seen FROM watch_devices WHERE user_id=? AND expires_at>? ORDER BY created_at DESC').bind(userId,Date.now()).all();
   return json({devices:devices.results});
  }catch{return json({error:'Watch settings could not be loaded. Please retry.'},503)}
 }
 async function native(request:Request){
  try{
   const path=new URL(request.url).pathname.slice(watchPrefix.length);
   if(!['pair','workout','command'].includes(path))return json({error:'Not found.'},404);
   // Native HTTPS only. Browser requests cannot use these endpoints through CORS.
   if(request.headers.has('origin'))return json({error:'Use the paired watch app.'},403);
   const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
   if(!(path==='pair'&&request.method==='POST')&&!token)return json({error:'Pair your watch in First Rep settings.'},401);
   await ensureWatchTables(db);
   if(path==='pair'&&request.method==='POST'){
    let parsed;try{parsed=pairSchema.safeParse(await body(request))}catch{return json({error:'Invalid request.'},400)}
    if(!parsed.success)return json({error:'Invalid device name.'},400);
    const now=Date.now(),bucket=await hash((request.headers.get('cf-connecting-ip')||'unknown')+':'+Math.floor(now/(60*minute)));
    await db.batch([
     db.prepare('DELETE FROM watch_pair_limits WHERE expires_at<?').bind(now),
     db.prepare('DELETE FROM watch_devices WHERE expires_at<?').bind(now),
     db.prepare('DELETE FROM watch_receipts WHERE created_at<?').bind(now-91*day),
     db.prepare('INSERT INTO watch_pair_limits(bucket,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1').bind(bucket,now+60*minute),
    ]);
    const attempts=await db.prepare('SELECT attempts FROM watch_pair_limits WHERE bucket=?').bind(bucket).first<{attempts:number}>();
    if(attempts!.attempts>10)return json({error:'Too many pairing attempts. Try again in an hour.'},429);
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=crypto.getRandomValues(new Uint8Array(8)),code=Array.from(bytes,b=>alphabet[b%32]).join(''),token=random(32),id=crypto.randomUUID();
    await db.prepare('INSERT INTO watch_devices(id,token_hash,code_hash,name,created_at,expires_at) VALUES(?,?,?,?,?,?)').bind(id,await hash(token),await hash(code),parsed.data.name,now,now+10*minute).run();
    return json({token,code,expiresAt:now+10*minute},201);
   }
   if(!token)return json({error:'Pair your watch in First Rep settings.'},401);
   const device=await db.prepare('SELECT id,user_id,name,expires_at,created_at,last_seen FROM watch_devices WHERE token_hash=? AND expires_at>?').bind(await hash(token),Date.now()).first<Device>();
   if(!device)return json({error:'Pairing expired or this watch was revoked. Pair again.'},401);
   if(path==='pair'&&request.method==='GET')return json({approved:!!device.user_id,expiresAt:device.expires_at});
   if(!device.user_id)return json({error:'Approve this watch in First Rep settings.'},403);
   if(path==='workout'&&request.method==='GET'){
    if(!device.last_seen||Date.now()-device.last_seen>5*minute)await db.prepare('UPDATE watch_devices SET last_seen=? WHERE id=?').bind(Date.now(),device.id).run();
    return json(await snapshot(device.user_id));
   }
   if(path==='command'&&request.method==='POST'){
    let parsed;try{parsed=envelope.safeParse(await body(request))}catch{return json({error:'Invalid command.'},400)}
    if(!parsed.success||!['start','set','skip','finish','swap'].includes(String(parsed.data.command.type)))return json({error:'Unsupported watch action.'},400);
    const command=JSON.stringify(parsed.data.command),url=new URL(request.url);
    const result=await workouts.handle(new Request(url.origin+'/firstrep/api/workouts',{method:'POST',headers:{origin:url.origin,'content-type':'application/json'},body:command}),device.user_id,{deviceId:device.id,operationId:parsed.data.operationId,bodyHash:await hash(command)});
    if(!result.ok)return result;
    return json(await snapshot(device.user_id));
   }
   return json({error:'Method not allowed.'},405);
  }catch{return json({error:'Watch sync is unavailable. Your watch can retry.'},503)}
 }
 return {owner,native};
}
