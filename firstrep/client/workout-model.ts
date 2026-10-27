import human from './human-coach.json';
import { machines } from './equipment';
import { familyFor } from './exercise-families';

export type Learning = Record<string,{status?:string;availability?:string;weight?:string}|undefined>;
export type Option = {id:string;label:string;guideId?:string};
export type Slot = {id:string;label:string;bodypart:string;sets:number;reps:string;options:Option[];optional?:boolean;originalLine?:string;unit?:'reps'|'minutes'};
export type Template = {id:string;title:string;slots:Slot[];estimatedMinutes:[number,number];note?:string};
export type WorkoutPlan = {id:string;name:string;days:number;sequence:string[];templates:Template[];sourceText?:string;cycleWeeks?:number};
export type SetLog = {reps:string;load:string;done:boolean};
export type SessionSlot = Slot & {option:Option|null;learning:boolean;skipped:boolean;skipReason:string;logs:SetLog[]};
export type WorkoutSession = {id:string;planId:string;title:string;templateId:string;startedAt:string;finishedAt:string|null;status:'active'|'finished'|'abandoned';revision:number;learningLimit:number;slots:SessionSlot[];notes:string;custom:boolean;introductory:boolean};
export type WorkoutSettings = {planId:string;choices:Record<string,string>};
export type WorkoutState = {settings:WorkoutSettings;settingsRevision:number;sessions:WorkoutSession[]};
export const defaultWorkoutSettings:WorkoutSettings={planId:'starter',choices:{}};
export const optionFor=(id:string):Option=>({id,label:machines.find(m=>m.id===id)?.name||id,guideId:id});
const slot=(id:string,label:string,bodypart:string,ids:string[],optional=false):Slot=>({id,label,bodypart,sets:2,reps:'8–12',options:ids.map(optionFor),optional});
const starter:WorkoutPlan={id:'starter',name:'First Rep Starter',days:3,sequence:['A','B'],templates:[
 {id:'A',title:'Full body A',estimatedMinutes:[50,55],slots:[slot('legs','Leg push','Legs',['leg-press','goblet-squat']),slot('press','Chest press','Chest',['chest-press','dumbbell-bench-press','barbell-bench-press']),slot('pull','Horizontal pull','Back',['seated-row','dumbbell-row']),slot('posterior','Leg curl','Hamstrings',['leg-curl']),slot('extra','Abdominal crunch','Core',['abdominal-crunch'],true)]},
 {id:'B',title:'Full body B',estimatedMinutes:[50,55],slots:[slot('legs','Leg push','Legs',['leg-press','goblet-squat']),slot('press','Chest press','Chest',['chest-press','dumbbell-bench-press','barbell-bench-press']),slot('pull','Vertical pull','Back',['lat-pulldown']),slot('posterior','Hip hinge','Hamstrings & glutes',['dumbbell-rdl','kettlebell-deadlift','barbell-rdl']),slot('extra','Shoulder press','Shoulders',['shoulder-press'],true)]},
 {id:'OPTIONAL',title:'Optional cardio & technique',estimatedMinutes:[25,40],note:'A comfortable fourth visit. It does not advance your A/B strength sequence.',slots:[{id:'cardio',label:'Comfortable cardio',bodypart:'Heart & lungs',sets:1,reps:'15–25 minutes at a conversational effort',unit:'minutes',options:['bike','treadmill','elliptical','rowing-erg'].map(optionFor)}, {...slot('technique','Light technique practice','Your choice',['leg-press','chest-press','seated-row','lat-pulldown','leg-curl','dumbbell-rdl'],true),sets:1,reps:'5–8 easy practice reps'}]},
]};
const exactGuides:Record<string,string>={
 'barbell benchpress':'barbell-bench-press','barbell bench press':'barbell-bench-press','lat pulldown machine':'lat-pulldown','dumbbel row':'dumbbell-row','dumbbell row':'dumbbell-row','dumbbell benchpress':'dumbbell-bench-press','dumbbell lateral raise':'dumbbell-lateral-raise','rear delt fly':'rear-delt-fly','reverse peck deck':'rear-delt-fly','facepull':'face-pull','barbell strict curl':'barbell-curl','ez-bar curl':'barbell-curl','dumbbell curl':'dumbbell-curl','romanian deadlift':'barbell-rdl','legpress':'leg-press','leg extensions':'leg-extension','hamstring curls':'leg-curl','triceps pushdown':'cable-triceps',
};
const originals:WorkoutPlan[]=human.plans.map(p=>({id:p.id,name:`Human Coach Guide · ${p.days} days`,days:p.days,sequence:p.sequence,cycleWeeks:p.cycleWeeks,sourceText:p.introAndHelp,templates:p.sessions.map(s=>({id:s.id,title:s.title,estimatedMinutes:(s.id.startsWith('UPPER')?[75,105]:p.days===3?[65,90]:[50,75]) as [number,number],slots:s.exercises.map(e=>({id:e.id,label:e.movement,bodypart:e.bodypart,sets:e.sets,reps:e.reps,originalLine:e.originalLine,options:e.alternatives.map((name,i)=>({id:`${e.id}-${i}`,label:name,guideId:exactGuides[name.toLowerCase()]}))}))}))}));
export const workoutPlans:WorkoutPlan[]=[starter,...originals];
export const planById=(id:string)=>workoutPlans.find(p=>p.id===id);
export const supplements=human.supplements;
export const preferenceKey=(planId:string,templateId:string,slotId:string)=>`${planId}:${templateId}:${slotId}`;
export const eligible=(o:Option,learning:Learning)=>!!o.guideId&&learning[o.guideId]?.availability==='available'&&learning[o.guideId]?.status!=='help';
export const isNew=(o:Option,learning:Learning)=>!!o.guideId&&learning[o.guideId]?.status!=='learned';
export function nextTemplate(plan:WorkoutPlan,sessions:WorkoutSession[]){
 const completed=sessions.filter(s=>s.planId===plan.id&&s.status==='finished'&&plan.sequence.includes(s.templateId)).length;
 return plan.templates.find(t=>t.id===plan.sequence[completed%plan.sequence.length])!;
}
export function prepareSlots(plan:WorkoutPlan,template:Template,settings:WorkoutSettings,learning:Learning,pace:number):SessionSlot[]{
 let remaining=Math.max(1,Math.min(2,pace));
 const used=new Set<string>();
 return template.slots.map(s=>{
  const preferred=settings.choices[preferenceKey(plan.id,template.id,s.id)];
  let option=s.options.find(o=>o.id===preferred)||null;
  if(plan.id==='starter'){
   const candidates=s.options.filter(o=>eligible(o,learning)&&!used.has(o.guideId!));
   if(!option||!candidates.some(o=>o.id===option!.id))option=candidates.find(o=>!isNew(o,learning))||candidates[0]||null;
   if(option&&isNew(option,learning)&&remaining===0)option=candidates.find(o=>!isNew(o,learning))||null;
   // Optional work is opt-in, and never uses the new-guide budget ahead of a core slot.
   if(s.optional&&!preferred)option=null;
   if(option){used.add(option.guideId!);if(isNew(option,learning))remaining--;}
  }else option=option||s.options[0]||null;
  const learningNow=!!option&&isNew(option,learning);
  const sets=plan.id==='starter'&&learningNow?1:s.sets;
  return {...s,option,learning:learningNow,skipped:!option,skipReason:!option?(s.optional?'Optional — not selected':'Learn or confirm a suitable setup first'):'',logs:Array.from({length:sets},()=>({reps:'',load:'',done:false}))};
 });
}
export function overlapMessages(slots:SessionSlot[]){
 const groups=new Map<string,string[]>();
 for(const s of slots){if(s.skipped||!s.option?.guideId)continue;const f=familyFor(s.option.guideId);if(!f)continue;groups.set(f.id,[...(groups.get(f.id)||[]),s.option.label]);}
 return [...groups].filter(([,v])=>v.length>1).map(([id,names])=>`${familyFor(slots.find(s=>s.option?.guideId&&familyFor(s.option.guideId)?.id===id)!.option!.guideId!)!.name}: ${names.join(' + ')} adds work for overlapping muscles.`);
}
