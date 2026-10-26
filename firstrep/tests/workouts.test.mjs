import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {runInNewContext} from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),cache=new Map();
function load(file){
 const path=resolve(file);if(cache.has(path))return cache.get(path).exports;
 if(path.endsWith('.json'))return JSON.parse(readFileSync(path,'utf8'));
 const module={exports:{}};cache.set(path,module);
 const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 runInNewContext(code,{module,exports:module.exports,Response,Request,URL,Headers,TextEncoder,crypto,console,setTimeout,clearTimeout,require:name=>{
  if(!name.startsWith('.'))return require(name);const base=resolve(dirname(path),name);return load([base,base+'.ts',base+'.tsx',base+'.json'].find(existsSync));
 }},{filename:path});return module.exports;
}
const model=load('firstrep/client/workout-model.ts'),{families}=load('firstrep/client/exercise-families.ts'),{machines}=load('firstrep/client/equipment.ts');
const {suggestGuides}=load('firstrep/client/learning-plan.ts');
const {workoutService}=load('firstrep/server/workouts.ts');
const source=JSON.parse(readFileSync('firstrep/client/human-coach.json','utf8'));
const plain=x=>JSON.parse(JSON.stringify(x));
const originalHashes={
 'human-2':'1302af720078b6c9d75b3714a19b5592ee3347219227899f722160d2913b8c0a',
 'human-3':'2cec6c2390d4aeb94be4ed4ff16d2fac7c2cc502e4f3fc46fd89ab88ad897dc1',
 'human-4':'7f5090fe15ba735763debc13c57ac62930480f3f21e26b89beb7a6bb1914805c',
 'human-5':'458247af119d1471db8c59b63131dbc873d2f4df921ea52963c68b68014a5023',
 'human-6':'70d3f08c59c5a0711c938e6c7ed23d73e15b51d376999789d7080156c37e9cc7',
};
test('all 27 guides have one family and original prescriptions remain faithful to supplied PDFs',()=>{
 const ids=families.flatMap(f=>f.ids);assert.equal(new Set(ids).size,27);assert.deepEqual([...ids].sort(),plain(machines.map(m=>m.id)).sort());
 assert.equal(families.length,17);assert.equal(model.supplements.length,5);
 for(const p of source.plans){
  const text=p.sessions.flatMap(s=>s.exercises.map(e=>e.originalLine)).join('\n');
  assert.equal(createHash('sha256').update(text).digest('hex'),originalHashes[p.id]);
  const rendered=model.planById(p.id);assert.deepEqual(plain(rendered.sequence),p.sequence);
  for(const t of rendered.templates){const sourceSession=p.sessions.find(s=>s.id===t.id);assert.equal(t.slots.length,sourceSession.exercises.length);assert.deepEqual(plain(t.slots.map(s=>[s.sets,s.reps,s.options.map(o=>o.label)])),sourceSession.exercises.map(e=>[e.sets,e.reps,e.alternatives]));}
 }
 assert.deepEqual(plain(model.planById('human-2').sequence),['UPPER1','LOWER1','UPPER2','LOWER2']);assert.equal(model.planById('human-2').cycleWeeks,2);
 assert.equal(model.planById('human-4').templates.find(s=>s.id==='UPPER1').slots.reduce((n,s)=>n+s.sets,0),31);
 assert.equal(model.planById('human-3').templates.find(s=>s.id==='LOWER1').slots.reduce((n,s)=>n+s.sets,0),24);
});
const allLearned=Object.fromEntries(machines.map(m=>[m.id,{status:'learned',availability:'available'}]));
test('starter respects equipment, learning budget, preferences and A/B sequence',()=>{
 const p=model.planById('starter'),t=p.templates[0];
 const learning=Object.fromEntries(machines.map(m=>[m.id,{status:'new',availability:'available'}]));
 let slots=model.prepareSlots(p,t,model.defaultWorkoutSettings,learning,2);assert.equal(slots.filter(s=>!s.skipped).length,2);assert.ok(slots.filter(s=>s.learning).every(s=>s.logs.length===1));
 slots=model.prepareSlots(p,t,model.defaultWorkoutSettings,allLearned,2);assert.equal(slots.filter(s=>!s.skipped).length,4);assert.ok(slots.filter(s=>!s.skipped).every(s=>s.logs.length===2));
 const settings={planId:'starter',choices:{'starter:A:press':'dumbbell-bench-press'}};
 slots=model.prepareSlots(p,t,settings,allLearned,2);assert.equal(slots[1].option.id,'dumbbell-bench-press');
 const unavailable=structuredClone(allLearned);unavailable['dumbbell-bench-press'].availability='missing';slots=model.prepareSlots(p,t,settings,unavailable,2);assert.equal(slots[1].option.id,'chest-press');
 assert.equal(model.nextTemplate(p,[]).id,'A');assert.equal(model.nextTemplate(p,[{planId:'starter',status:'finished',templateId:'A'}]).id,'B');
 assert.equal(model.nextTemplate(p,[{planId:'starter',status:'finished',templateId:'OPTIONAL'},{planId:'starter',status:'abandoned',templateId:'A'}]).id,'A');
 const progress={'cable-curl':{status:'learned'},'dumbbell-curl':{availability:'available'},'barbell-curl':{availability:'available'},'dumbbell-rdl':{availability:'available'}};
 assert.deepEqual(plain(suggestGuides(machines,progress,2).map(m=>m.id)),['dumbbell-rdl','dumbbell-curl']);
});

function database(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('firstrep/migrations/0001_firstrep.sql','utf8'));
 const db={prepare(query){let args=[];const statement={bind(...values){args=values.map(v=>v instanceof ArrayBuffer?Buffer.from(v):v);return statement},async run(){const r=sql.prepare(query).run(...args);return {success:true,meta:{changes:Number(r.changes)}}},async first(){const row=sql.prepare(query).get(...args);if(row)for(const k of Object.keys(row))if(row[k] instanceof Uint8Array)row[k]=Array.from(row[k]);return row||null},async all(){return {results:sql.prepare(query).all(...args),success:true}}};return statement},async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};return db;
}
const origin='https://josephjasin.com';
function fixture(){
 const db=database(),learning={machines:structuredClone(allLearned),preferences:{pace:2},visits:[]};const service=workoutService(db,async()=>learning);
 const get=async(user='alice',path='workouts')=>{const r=await service.handle(new Request(`${origin}/firstrep/api/${path}`),user);return {status:r.status,data:await r.json()}};
 const post=async(body,user='alice',requestOrigin=origin)=>{const r=await service.handle(new Request(`${origin}/firstrep/api/workouts`,{method:'POST',headers:{origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify(body)}),user);return {status:r.status,data:await r.json()}};
 const active=async()=> (await get()).data.sessions.find(s=>s.status==='active');
 return {db,learning,get,post,active};
}
test('workouts persist across devices, reject stale writes, preserve active plan and original/custom distinction',async()=>{
 const {get,post,active}=fixture();assert.equal((await get()).status,200);
 assert.equal((await post({type:'settings',revision:0,planId:'human-4'},'alice','https://bad.test')).status,403);
 let result=await post({type:'settings',revision:0,planId:'human-4'});assert.equal(result.status,200);
 const first=crypto.randomUUID();await Promise.all([post({type:'start',id:first,settingsRevision:1}),post({type:'start',id:crypto.randomUUID(),settingsRevision:1})]);
 assert.equal((await get()).data.sessions.length,1);let s=await active();assert.equal(s.planId,'human-4');assert.equal(s.templateId,'UPPER1');
 await post({type:'settings',revision:1,planId:'starter'});assert.equal((await active()).planId,'human-4');
 assert.equal((await post({type:'finish',id:s.id,revision:0},'bob')).status,404);
 assert.equal((await get('bob')).data.sessions.length,0);
 const chest=s.slots.find(x=>x.label==='horizontal push');
 result=await post({type:'swap',id:s.id,revision:s.revision,slotId:chest.id,optionId:'guide:chest-press'});assert.equal(result.status,200);
 s=await active();assert.equal(s.custom,true);assert.equal(s.slots.find(x=>x.id===chest.id).option.guideId,'chest-press');assert.ok(model.planById('human-4').templates[0].slots.find(x=>x.id===chest.id).options.every(o=>o.guideId!=='chest-press'));
 const log={reps:'10',load:'20 kg',done:true};
 const concurrent=await Promise.all([post({type:'set',id:s.id,revision:s.revision,slotId:chest.id,index:0,log}),post({type:'set',id:s.id,revision:s.revision,slotId:chest.id,index:1,log})]);
 assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);s=await active();assert.equal(s.slots.find(x=>x.id===chest.id).logs.filter(l=>l.done).length,1);
 assert.equal((await post({type:'swap',id:s.id,revision:s.revision,slotId:chest.id,optionId:chest.options[0].id})).status,409);
 assert.equal((await post({type:'finish',id:s.id,revision:s.revision,notes:'Preserve this note'})).status,200);
 assert.equal((await post({type:'start',id:first,settingsRevision:2})).data.sessions.length,1,'Retry of a finished start cannot create another workout');
 await post({type:'start',id:crypto.randomUUID(),settingsRevision:2});s=await active();assert.equal(s.planId,'starter');assert.equal(s.templateId,'A');
 assert.equal((await post({type:'finish',id:s.id,revision:s.revision})).status,400,'No invented completed sets');
 const backup=(await get('alice','workouts/export')).data;assert.equal(backup.format,'firstrep-workouts');assert.ok(!JSON.stringify(backup).includes('user_id'));
 assert.equal((await post({type:'import',backup},'copy')).status,200);assert.equal((await get('copy')).data.sessions.length,2);
 assert.equal((await post({type:'import',backup},'copy')).status,200);assert.equal((await get('copy')).data.sessions.length,2);
 assert.equal((await get('copy')).data.sessions.find(x=>x.status==='finished').notes,'Preserve this note');
 const bad=structuredClone(backup);bad.sessions[0].userId='alice';assert.equal((await post({type:'import',backup:bad},'copy')).status,400);
});
test('starter prevents unavailable swaps and excessive unfamiliar exercises; legacy visits remain intact',async()=>{
 const {learning,get,post,active}=fixture();await get();learning.visits=[{finishedAt:null}];assert.equal((await post({type:'start',id:crypto.randomUUID(),settingsRevision:0})).status,409);learning.visits=[];
 for(const item of Object.values(learning.machines))item.status='new';
 await post({type:'start',id:crypto.randomUUID(),settingsRevision:0});let s=await active();assert.equal(s.introductory,true);assert.equal(s.slots.filter(x=>!x.skipped).length,2);
 const pull=s.slots.find(x=>x.id==='pull');assert.equal((await post({type:'swap',id:s.id,revision:s.revision,slotId:pull.id,optionId:'seated-row'})).status,409);
 learning.machines['dumbbell-bench-press'].availability='missing';assert.equal((await post({type:'swap',id:s.id,revision:s.revision,slotId:'press',optionId:'dumbbell-bench-press'})).status,409);
 assert.equal((await post({type:'set',id:s.id,revision:s.revision,slotId:'legs',index:0,log:{reps:'',load:'10',done:true}})).status,400);
 assert.equal((await post({type:'finish',id:s.id,revision:s.revision,abandon:true})).status,200);assert.equal(model.nextTemplate(model.planById('starter'),(await get()).data.sessions).id,'A');
});
test('database prevents simultaneous learning visits and workouts, and optional visits do not advance A/B',async()=>{
 const {db,get,post,active}=fixture();await get();
 await db.prepare('INSERT INTO visits(user_id,id,machine_ids,started_at) VALUES(?,?,?,?)').bind('alice','old-visit','[]',new Date().toISOString()).run();
 assert.equal((await post({type:'start',id:crypto.randomUUID(),settingsRevision:0})).status,409,'Database guard catches a concurrent legacy visit even when progress snapshot is stale');
 await db.prepare('UPDATE visits SET finished_at=? WHERE id=?').bind(new Date().toISOString(),'old-visit').run();
 await post({type:'start',id:crypto.randomUUID(),settingsRevision:0,optional:true});let s=await active();assert.equal(s.templateId,'OPTIONAL');
 const ignored=await db.prepare('INSERT INTO visits(user_id,id,machine_ids,started_at) VALUES(?,?,?,?)').bind('alice','another-visit','[]',new Date().toISOString()).run();assert.equal(ignored.meta.changes,0);
 await post({type:'set',id:s.id,revision:s.revision,slotId:'cardio',index:0,log:{reps:'20',load:'Level 2',done:true}});s=await active();await post({type:'finish',id:s.id,revision:s.revision});
 await post({type:'start',id:crypto.randomUUID(),settingsRevision:0});assert.equal((await active()).templateId,'A');
});
test('skipping remaining work preserves completed sets and a finished workout',async()=>{
 const {get,post,active}=fixture();await get();
 await post({type:'start',id:crypto.randomUUID(),settingsRevision:0});let s=await active();
 await post({type:'set',id:s.id,revision:s.revision,slotId:'legs',index:0,log:{reps:'10',load:'20 kg',done:true}});s=await active();
 await post({type:'skip',id:s.id,revision:s.revision,slotId:'legs',skipped:true});s=await active();
 const Workouts=load('firstrep/client/workouts.tsx').default;
 const store={data:(await get()).data,loaded:true,canWrite:true,busy:false,error:'',mutate:async()=>true};
 const html=renderToStaticMarkup(React.createElement(Workouts,{store,learning:allLearned,pace:2,mode:'today',onOpen(){},onNavigate(){}}));
 assert.equal(html.match(/elapsed · ([^<]+) sets logged/)?.[1],'1/7','Logged sets still count after skipping the rest of an exercise');
 assert.equal((await post({type:'finish',id:s.id,revision:s.revision,abandon:true})).status,400,'A recorded workout cannot be discarded as empty');
 assert.equal((await post({type:'finish',id:s.id,revision:s.revision})).status,200);
 const saved=(await get()).data.sessions[0];assert.equal(saved.status,'finished');assert.equal(saved.slots[0].logs[0].load,'20 kg');
});
test('re-including skipped exercises enforces the original learning limit and available setups',async()=>{
 const {learning,get,post,active}=fixture();await get();
 for(const item of Object.values(learning.machines))item.status='new';
 await post({type:'start',id:crypto.randomUUID(),settingsRevision:0});let s=await active();
 await post({type:'skip',id:s.id,revision:s.revision,slotId:'legs',skipped:true});s=await active();
 assert.equal((await post({type:'swap',id:s.id,revision:s.revision,slotId:'pull',optionId:'seated-row'})).status,200);s=await active();
 assert.equal((await post({type:'skip',id:s.id,revision:s.revision,slotId:'legs',skipped:false})).status,409);
 await post({type:'skip',id:s.id,revision:s.revision,slotId:'pull',skipped:true});s=await active();
 learning.machines['leg-press'].availability='missing';
 assert.equal((await post({type:'skip',id:s.id,revision:s.revision,slotId:'legs',skipped:false})).status,409);
 learning.machines['leg-press'].availability='available';
 assert.equal((await post({type:'skip',id:s.id,revision:s.revision,slotId:'legs',skipped:false})).status,200);
});
test('a completed learning set still uses the visit learning allowance when its remaining work is skipped',async()=>{
 const {learning,get,post,active}=fixture();await get();learning.preferences.pace=1;
 for(const item of Object.values(learning.machines))item.status='new';
 await post({type:'start',id:crypto.randomUUID(),settingsRevision:0});let s=await active();
 await post({type:'set',id:s.id,revision:s.revision,slotId:'legs',index:0,log:{reps:'8',load:'light',done:true}});s=await active();
 await post({type:'skip',id:s.id,revision:s.revision,slotId:'legs',skipped:true});s=await active();
 assert.equal((await post({type:'swap',id:s.id,revision:s.revision,slotId:'press',optionId:'chest-press'})).status,409);
});
test('switching from a new exercise to a learned alternative restores its working sets',async()=>{
 const {learning,get,post,active}=fixture();await get();learning.machines['leg-press'].status='new';
 await post({type:'settings',revision:0,choice:{key:'starter:A:legs',optionId:'leg-press'}});
 await post({type:'start',id:crypto.randomUUID(),settingsRevision:1});let s=await active();assert.equal(s.slots[0].logs.length,1);
 assert.equal((await post({type:'swap',id:s.id,revision:s.revision,slotId:'legs',optionId:'goblet-squat'})).status,200);s=await active();
 assert.equal(s.slots[0].learning,false);assert.equal(s.slots[0].logs.length,2);assert.equal(s.slots[0].sets,2);
});
test('each plan completes its whole sequence and round-trips history through a backup',async()=>{
 for(const plan of model.workoutPlans){
  const {get,post,active}=fixture();await get();
  assert.equal((await post({type:'settings',revision:0,planId:plan.id})).status,200);
  for(const templateId of plan.sequence){
   assert.equal((await post({type:'start',id:crypto.randomUUID(),settingsRevision:1})).status,200);
   let s=await active();assert.equal(s.templateId,templateId);
   for(const slot of s.slots.filter(x=>!x.skipped)){
    assert.equal((await post({type:'set',id:s.id,revision:s.revision,slotId:slot.id,index:0,log:{reps:'10',load:slot.id+' load',done:true}})).status,200);s=await active();
   }
   assert.equal((await post({type:'finish',id:s.id,revision:s.revision,notes:plan.name})).status,200);
  }
  const state=(await get()).data;assert.equal(state.sessions.filter(x=>x.status==='finished').length,plan.sequence.length);
  assert.equal(model.nextTemplate(plan,state.sessions).id,plan.sequence[0]);
  const backup=(await get('alice','workouts/export')).data;
  assert.equal((await post({type:'import',backup},'restored')).status,200);
  assert.deepEqual((await get('restored')).data.sessions,state.sessions);
 }
});
test('plan and session views render both plans, original slots, set logs and grouped guides',()=>{
 const Workouts=load('firstrep/client/workouts.tsx').default,Groups=load('firstrep/client/exercise-groups.tsx').default;
 const store={data:{settings:model.defaultWorkoutSettings,settingsRevision:0,sessions:[]},loaded:true,canWrite:true,busy:false,error:'',mutate:async()=>true};
 let html=renderToStaticMarkup(React.createElement(Workouts,{store,learning:allLearned,pace:2,mode:'plans',onOpen(){},onNavigate(){}}));assert.match(html,/Human Coach Guide/);assert.match(html,/First Rep Starter/);assert.match(html,/60-minute visit limit/);assert.equal((html.match(/class="slot-number"/g)||[]).length,5);
 const newLearning=Object.fromEntries(machines.map(m=>[m.id,{status:'new',availability:'available'}]));
 html=renderToStaticMarkup(React.createElement(Workouts,{store,learning:newLearning,pace:2,mode:'plans',onOpen(){},onNavigate(){}}));
 assert.equal((html.match(/class="target-reps">1 set ×/g)||[]).length,2,'Learning previews show one practice set, matching the actual workout');
 store.data.settings={planId:'human-4',choices:{}};html=renderToStaticMarkup(React.createElement(Workouts,{store,learning:allLearned,pace:2,mode:'plans',onOpen(){},onNavigate(){}}));assert.match(html,/Human Coach Guide/);assert.match(html,/Explore original routines/);assert.equal((html.match(/class="slot-number"/g)||[]).length,11);assert.doesNotMatch(html,/Add original PDFs|Human Coach Guide PDFs|<iframe/);assert.equal((html.match(/<h2>Original supporting text<\/h2>/g)||[]).length,1);for(const supplement of model.supplements)assert.ok(html.includes(renderToStaticMarkup(React.createElement('summary',null,supplement.title))));assert.match(html,/Original schedule/);
 const p=model.planById('starter');store.data.sessions=[{id:crypto.randomUUID(),planId:'starter',templateId:'A',title:'Full body A',startedAt:new Date().toISOString(),finishedAt:null,status:'active',revision:0,slots:model.prepareSlots(p,p.templates[0],model.defaultWorkoutSettings,allLearned,2),notes:'',custom:false,introductory:false}];
 html=renderToStaticMarkup(React.createElement(Workouts,{store,learning:allLearned,pace:2,mode:'today',onOpen(){},onNavigate(){}}));assert.equal((html.match(/class="set-log-row /g)||[]).length,8);assert.match(html,/Finish this visit/);
 html=renderToStaticMarkup(React.createElement(Groups,{visible:machines,learning:allLearned,onOpen(){}}));assert.equal((html.match(/class="panel family-card"/g)||[]).length,17);assert.match(html,/27|17 of 17/);
});
