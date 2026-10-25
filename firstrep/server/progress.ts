import { and, desc, eq, isNull } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { BatchItem } from 'drizzle-orm/batch';
import { z } from 'zod';
import { machines } from '../client/equipment';
import { suggestGuides } from '../client/learning-plan';
import * as schema from './schema';
const { progress, preferences, visits, profile } = schema;
const machineId = z.string().refine(id => machines.some(m => m.id === id));
const patch = z.object({
  status: z.enum(['new','learning','learned','help']).optional(),
  availability: z.enum(['unknown','available','missing']).optional(),
  seat: z.string().max(80).optional(), weight: z.string().max(40).optional(), notes: z.string().max(1200).optional(),
}).strict();
const prefs = z.object({pace:z.number().int().min(1).max(2),visitsPerWeek:z.number().int().min(2).max(4)}).strict();
const profileData = z.object({age:z.number().int().min(18).max(120).nullable(),heightCm:z.number().min(80).max(250).nullable(),startingWeightKg:z.number().min(20).max(500).nullable()}).strict();
const savedMachine = patch.required().extend({machineId,updatedAt:z.string().datetime()}).strict();
const savedVisit = z.object({id:z.string().uuid(),machineIds:z.array(machineId).max(machines.length),startedAt:z.string().datetime(),finishedAt:z.string().datetime().nullable()}).strict();
export const backupSchema = z.object({
  format:z.literal('firstrep-backup'),version:z.literal(1),exportedAt:z.string().datetime(),
  data:z.object({machines:z.record(savedMachine),preferences:prefs,visits:z.array(savedVisit).max(2000),profile:profileData.nullable().optional()}).strict(),
}).strict().superRefine((backup,ctx) => {
  const entries=Object.entries(backup.data.machines);
  if(entries.length>machines.length || entries.some(([id,m])=>id!==m.machineId))ctx.addIssue({code:'custom',message:'Invalid equipment records.'});
  if(backup.data.visits.filter(v=>!v.finishedAt).length>1)ctx.addIssue({code:'custom',message:'Only one visit may be in progress.'});
  if(new Set(backup.data.visits.map(v=>v.id)).size!==backup.data.visits.length)ctx.addIssue({code:'custom',message:'Duplicate visit identifiers.'});
});
const commands=z.discriminatedUnion('type',[
  z.object({type:z.literal('machine'),id:machineId,patch}).strict(),
  prefs.extend({type:z.literal('preferences')}).strict(),
  z.object({type:z.literal('start')}).strict(),
  z.object({type:z.literal('finish'),id:z.string().uuid()}).strict(),
  z.object({type:z.literal('import'),backup:backupSchema}).strict(),
]);
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

async function scopedUuid(seed:string){
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(seed)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}

export function progressService(db:DrizzleD1Database<typeof schema>,hasWorkout?:(userId:string)=>Promise<boolean>){
  async function state(userId:string){
    const [rows,prefs,history,profiles]=await Promise.all([
      db.select().from(progress).where(eq(progress.userId,userId)),
      db.select().from(preferences).where(eq(preferences.userId,userId)),
      db.select().from(visits).where(eq(visits.userId,userId)).orderBy(desc(visits.startedAt)),
      db.select().from(profile).where(eq(profile.userId,userId)),
    ]);
    return {
      machines:Object.fromEntries(rows.map(({userId,...m})=>[m.machineId,m])),
      preferences:prefs[0]?{pace:prefs[0].pace,visitsPerWeek:prefs[0].visitsPerWeek}:{pace:2,visitsPerWeek:2},
      visits:history.map(({userId,...v})=>({...v,machineIds:JSON.parse(v.machineIds) as string[]})),
      profile:profiles[0]?{age:profiles[0].age,heightCm:profiles[0].heightCm,startingWeightKg:profiles[0].startingWeightKg}:null,
    };
  }
  async function handle(request:Request,userId:string):Promise<Response>{
    const url=new URL(request.url);
    try {
      if(request.method==='GET'){
        const data=await state(userId);
        if(url.pathname.endsWith('/export'))return new Response(JSON.stringify({format:'firstrep-backup',version:1,exportedAt:new Date().toISOString(),data},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="firstrep-backup.json"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
        return json(data);
      }
      if(request.method!=='POST'||url.pathname.endsWith('/export'))return json({error:'Method not allowed.'},405);
      if(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return json({error:'Invalid request origin or content type.'},403);
      if(Number(request.headers.get('content-length'))>2_000_000)return json({error:'Backup is too large.'},413);
      const body=await request.text();if(body.length>2_000_000)return json({error:'Backup is too large.'},413);
      let parsed;try{parsed=commands.safeParse(JSON.parse(body))}catch{return json({error:'Invalid JSON.'},400)}
      if(!parsed.success)return json({error:'Please check your entries or backup file.'},400);
      const c=parsed.data,now=new Date().toISOString();
      if(c.type==='machine')await db.insert(progress).values({userId,machineId:c.id,updatedAt:now,...c.patch}).onConflictDoUpdate({target:[progress.userId,progress.machineId],set:{...c.patch,updatedAt:now}});
      if(c.type==='preferences')await db.insert(preferences).values({userId,pace:c.pace,visitsPerWeek:c.visitsPerWeek}).onConflictDoUpdate({target:preferences.userId,set:{pace:c.pace,visitsPerWeek:c.visitsPerWeek}});
      if(c.type==='start'){
        if(hasWorkout&&await hasWorkout(userId))return json({error:'Finish your active workout before starting an equipment-only visit.'},409);
        const s=await state(userId);
        if(!s.visits.some(v=>!v.finishedAt)){
          const next=suggestGuides(machines,s.machines,s.preferences.pace).map(m=>m.id);
          if(!next.length&&!machines.some(m=>s.machines[m.id]?.status==='learned'&&s.machines[m.id]?.availability==='available'))return json({error:'Mark a suitable setup as found at your gym before starting a visit.'},409);
          const id=await scopedUuid(userId+':'+s.visits.filter(v=>v.finishedAt).map(v=>v.id).sort().join(','));
          await db.insert(visits).values({id,userId,machineIds:JSON.stringify(next),startedAt:now}).onConflictDoNothing();
          if(hasWorkout&&await hasWorkout(userId))return json({error:'A workout was started on another device. Continue that workout first.'},409);
        }
      }
      if(c.type==='finish')await db.update(visits).set({finishedAt:now}).where(and(eq(visits.id,c.id),eq(visits.userId,userId),isNull(visits.finishedAt)));
      if(c.type==='import'){
        // Restore missing records only. Existing progress and notes always win.
        const data=c.backup.data;
        const restores:[BatchItem<'sqlite'>,...BatchItem<'sqlite'>[]]=[db.insert(preferences).values({userId,...data.preferences}).onConflictDoNothing()];
        if(data.profile)restores.push(db.insert(profile).values({userId,...data.profile}).onConflictDoNothing());
        for(const m of Object.values(data.machines))restores.push(db.insert(progress).values({userId,...m}).onConflictDoNothing());
        for(const v of data.visits){
          restores.push(db.insert(visits).values({...v,userId,machineIds:JSON.stringify(v.machineIds)}).onConflictDoNothing());
        }
        await db.batch(restores);
      }
      return json(await state(userId));
    }catch{return json({error:'Your progress could not be saved or loaded. Please try again.'},503);}
  }
  return {state,handle};
}
