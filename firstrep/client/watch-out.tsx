'use client';
import { useId, useState } from 'react';
import { Check, CircleHelp, Maximize2, Minimize2, X } from 'lucide-react';
import { Equipment, Figure } from './movement-demo';
import { isFreeWeight, joint, movementPose, type Point, type Pose } from './movement-model';
import { formCues, type CueKind, type FormCue } from './form-cues';
import { isExtraMotion } from './extra-motion-model';
import { extraCueScene } from './extra-form-scenes';
const plus=(p:Point,dx:number,dy:number):Point=>[p[0]+dx,p[1]+dy];
const copy=(p:Pose):Pose=>JSON.parse(JSON.stringify(p));
function turn(p:Point,center:Point,degrees:number):Point{const a=degrees*Math.PI/180,x=p[0]-center[0],y=p[1]-center[1];return [center[0]+x*Math.cos(a)-y*Math.sin(a),center[1]+x*Math.sin(a)+y*Math.cos(a)]}
export function cueScene(id:string,kind:CueKind,bad:boolean){
 if(isExtraMotion(id))return extraCueScene(id,kind,bad);
 const phase=id==='kettlebell-deadlift'?.08:kind==='shrug'?0:kind==='hip-lift'||kind==='depth'?.12:kind==='knee-lock'?.5:.35;
 const base=movementPose(id,phase),p=copy(base);let focus:Point=[220,170],view='90 45 270 250';
 if(kind==='knee-lock'){
  if(id==='bike'){
   Object.assign(base,movementPose('bike',.25));Object.assign(p,copy(base));
   const dy=bad?-33:-28;p.hip=plus(p.hip,0,dy);p.shoulder=plus(p.shoulder,0,dy);p.head=plus(p.head,0,dy);
   p.knee=bad?[(p.hip[0]+p.ankle[0])/2,(p.hip[1]+p.ankle[1])/2]:joint(p.hip,p.ankle,62,65,-1);
   // Seat setting follows the rider in this static fit comparison.
  }else if(id==='leg-extension'){
   p.ankle=bad?plus(p.knee,63,0):plus(p.knee,61,14);
  }else if(id==='leg-press'){
   p.ankle=plus(p.hip,135,-32);
   p.knee=bad?[(p.hip[0]+p.ankle[0])/2,(p.hip[1]+p.ankle[1])/2]:joint(p.hip,p.ankle,70,70,-1);
  }
  focus=p.knee;view=id==='leg-press'?'125 115 205 140':id==='bike'?'170 135 150 150':'180 145 170 140';
 }
 if(kind==='hip-lift'||kind==='depth'){
  if(bad){p.hip=plus(p.hip,15,-24);if(kind==='depth'){p.ankle=plus(p.ankle,-27,0);p.knee=joint(p.hip,p.ankle,70,70,-1);p.spine=[p.hip,plus(p.hip,-2,-24),p.shoulder];}}
  focus=kind==='depth'?p.knee:p.hip;view=id==='leg-press'?(kind==='depth'?'95 80 235 185':'95 100 235 165'):'155 135 195 140';
 }
 if(kind==='wrist'){focus=p.wrist;view=id==='cable-curl'?'200 100 135 140':'195 100 150 125';}
 if(kind==='shrug'){
  if(bad){p.shoulder=plus(p.shoulder,0,-15);p.elbow=joint(p.shoulder,p.wrist,51,51,1)}focus=p.shoulder;view='165 75 160 145';
 }
 if(kind==='torso-swing'){
  if(bad){for(const k of ['shoulder','head','elbow','wrist'] as const)p[k]=turn(p[k],p.hip,id==='cable-triceps'?26:-30)}
  focus=[(p.hip[0]+p.shoulder[0])/2,(p.hip[1]+p.shoulder[1])/2];view=id.startsWith('cable-')?'130 45 215 245':'140 50 205 230';
 }
 if(kind==='neck'){
  if(bad)p.head=plus(p.head,27,9);focus=p.head;view=id==='abdominal-crunch'?'185 90 150 130':'170 65 170 145';
 }
 if(kind==='behind-neck'){
  Object.assign(base,movementPose(id,.5));Object.assign(p,copy(base));
  if(bad){p.wrist=[201,133];p.elbow=[176,164];p.head=plus(p.head,12,7)}
  focus=bad?[204,129]:p.wrist;view='140 65 175 150';
 }
 if(kind==='control'){focus=p.ankle;view='190 145 155 140';}
 if(kind==='back-arch'){
  p.spine=bad?[p.hip,[239,189],[233,161],p.shoulder]:[p.hip,[213,185],p.shoulder];focus=bad?[235,182]:[211,183];view='165 110 145 145';
 }
 if(kind==='crunch-range'){
  if(bad){for(const k of ['shoulder','head','elbow','wrist'] as const)p[k]=turn(p[k],p.hip,37);p.spine=[p.hip,plus(p.hip,22,-15),p.shoulder]}
  focus=p.shoulder;view='175 100 180 155';
 }
 if(kind==='upper-arm'){
  if(bad){p.elbow=turn(p.elbow,p.shoulder,-43);p.wrist=turn(p.wrist,p.shoulder,-43)}
  focus=p.elbow;view='195 100 140 150';
 }
 if(kind==='bike-seat'){
  Object.assign(base,movementPose('bike',.25));Object.assign(p,copy(base));
  // The low-seat example shortens the hip-to-pedal distance; the comparison leaves a visible knee bend.
  const dy=bad?25:-28;p.hip=plus(p.hip,0,dy);p.shoulder=plus(p.shoulder,0,dy);p.head=plus(p.head,0,dy);
  p.knee=joint(p.hip,p.ankle,62,65,-1);p.elbow=joint(p.shoulder,p.wrist,51,51,1);focus=p.knee;view='155 110 170 180';
 }
 if(id==='bike'){
  p.farKnee=joint(p.hip,p.farAnkle!,62,65,-1);
  p.elbow=joint(p.shoulder,p.wrist,51,51,1);
 }
 if(isFreeWeight(id)){
  view=id==='dumbbell-bench-press'?'120 65 245 230':id==='dumbbell-row'?'135 75 255 220':'120 45 265 250';
  if(kind==='wrist')view=`${p.wrist[0]-70} ${p.wrist[1]-60} 160 145`;
  if(kind==='torso-swing'&&bad){p.farElbow=plus(p.elbow,-8,1);p.farWrist=plus(p.wrist,-8,1)}
  if(id==='dumbbell-row'&&kind==='neck'){
   if(bad)p.head=plus(base.head,-8,-22);
   focus=p.head;
  }
  if(kind==='rounded-back'){
   if(bad)p.spine=[p.hip,plus(p.hip,-3,-27),plus(p.shoulder,-20,-15),p.shoulder];
   focus=[(p.hip[0]+p.shoulder[0])/2-(bad?12:0),(p.hip[1]+p.shoulder[1])/2-(bad?17:0)];
  }
  if(kind==='load-away'){
   if(bad){p.wrist=plus(p.wrist,43,0);p.elbow=joint(p.shoulder,p.wrist,50,50,1);p.farWrist=plus(p.wrist,-8,1);p.farElbow=plus(p.elbow,-8,1)}
   focus=p.wrist;
  }
  if(kind==='heel-lift'){
   if(bad){p.toe=plus(p.ankle,14,2);p.ankle=plus(p.ankle,0,-16)}
   focus=plus(p.ankle,4,2);view='160 175 145 125';
  }
  if(kind==='bench-hips'){
   if(bad){p.hip=plus(p.hip,0,-27);p.spine=[p.hip,[230,168],p.shoulder]}
   focus=p.hip;
  }
 }
 // Connect cable/lever handles to the illustrated hand while keeping the seat and back pad stationary.
 const machine=isFreeWeight(id)?p:{...base,wrist:p.wrist,ankle:p.ankle,...(id==='bike'?{hip:p.hip}:{})};
 return {base,p,machine,focus,view,phase};
}
function TreadmillDiagram({kind,bad,tone}:{kind:CueKind;bad:boolean;tone:string}){
 const start=kind==='treadmill-start';
 return <g fill="none" strokeLinecap="round" strokeLinejoin="round">
 <rect x="35" y="24" width="210" height="125" rx="14" fill="#242c23" stroke="#58644e" strokeWidth="4"/>
 <rect x="55" y="41" width="170" height="54" rx="6" fill="#141b12"/>
 <text x="140" y="62" textAnchor="middle" fontFamily="sans-serif" fontSize="10" letterSpacing="1" fill="#99a68c">{start?'STARTING PACE':'BEFORE STEPPING OFF'}</text>
 <text x="140" y="82" textAnchor="middle" fontFamily="sans-serif" fontSize="16" fontWeight="bold" fill={tone}>{start?(bad?'FAST START':'EASY START'):(bad?'BELT MOVING':'BELT STOPPED')}</text>
 <circle cx="104" cy="121" r="12" fill="#536c3b"/><path d="M101 115l8 6-8 6Z" fill="#e4eed9" stroke="none"/>
 <circle cx="176" cy="121" r="12" fill="#884a3d"/><rect x="171" y="116" width="10" height="10" rx="1" fill="#ffdfd2"/>
 <path d="M73 178H225L239 162" stroke="#68785a" strokeWidth="8"/>
 {bad?<g stroke={tone} strokeWidth="3"><path d="M70 196h40m-7-5 7 5-7 5M130 196h40m-7-5 7 5-7 5M190 196h34m-7-5 7 5-7 5"/>{start&&<path d="M78 207h24m30 0h24m30 0h24" strokeWidth="2"/>}</g>:start?<path d="M121 197h38m-7-5 7 5-7 5" stroke={tone} strokeWidth="3"/>:<g stroke={tone} strokeWidth="4"><path d="M132 190v17m16-17v17"/></g>}
 {!start&&<path d={bad?'M135 167l12-12 19 6 20 13':'M123 167h40'} stroke="#e7eddf" strokeWidth="8"/>}
 <circle cx={start?140:176} cy={start?76:121} r={start?64:19} stroke={tone} strokeWidth="2" strokeDasharray="4 4" opacity=".8"/>
 </g>
}
export function WarningDiagram({id,cue,bad,label}:{id:string;cue:FormCue;bad:boolean;label:string}){
 const tone=bad?'#ffad8c':'#c3ee74',scene=cueScene(id,cue.kind,bad),{p,machine,focus,view,phase}=scene;
 const special=cue.kind.startsWith('treadmill-');
 const wristAngle=Math.atan2(p.wrist[1]-p.elbow[1],p.wrist[0]-p.elbow[0])+(bad?Math.PI/2:0);
 const hand:Point=[p.wrist[0]+17*Math.cos(wristAngle),p.wrist[1]+17*Math.sin(wristAngle)];
 const heldEquipment=isFreeWeight(id)&&cue.kind==='wrist'?{...machine,wrist:hand,farWrist:plus(hand,-8,1)}:machine;
 return <svg xmlns="http://www.w3.org/2000/svg" viewBox={special?'0 0 280 230':view} role="img" aria-labelledby={label+'-title '+label+'-desc'}>
 <title id={label+'-title'}>{(bad?'Avoid: ':'Aim for: ')+(bad?cue.avoid:cue.aim)}</title><desc id={label+'-desc'}>{cue.tip+' Simplified illustration; exact setup varies by equipment.'}</desc>
 {special?<TreadmillDiagram kind={cue.kind} bad={bad} tone={tone}/>:<>
 <Equipment id={id} p={heldEquipment} phase={phase}/>
 <Figure id={id} p={p} tint="#c8d1bd"/>
 {cue.kind==='wrist'&&<path d={`M${p.wrist.join(' ')}L${hand.join(' ')}`} stroke={tone} strokeWidth="8" strokeLinecap="round"/>}
 <circle cx={focus[0]} cy={focus[1]} r={cue.kind==='depth'?28:cue.kind==='wrist'?24:21} fill={bad?'#ffad8c0b':'#c3ee740b'} stroke={tone} strokeWidth="2" strokeDasharray="5 4"/>
 {cue.kind==='hip-lift'&&bad&&<path d={`M${p.hip[0]+17} ${p.hip[1]+21}v-16m-4 5 4-5 4 5`} fill="none" stroke={tone} strokeWidth="2.5"/>}
 {cue.kind==='control'&&<g fill="none" stroke={tone} strokeWidth="2.5" strokeLinecap="round">{bad?<><path d={`M${focus[0]+20} ${focus[1]-33}l-7 16 9-3-7 19`}/><path d={`M${focus[0]+33} ${focus[1]-24}l-6 13 8-2-6 14`}/></>:<path d={`M${focus[0]+25} ${focus[1]-26}q10 25-12 43m1-8-1 8 8-1`}/>}</g>}
 </>}
 </svg>
}
export default function WatchOut({id,text}:{id:string;text:string}){
 const [selected,setSelected]=useState(0),[expanded,setExpanded]=useState(false),label=useId(),cues=formCues[id],cue=cues[selected];
 return <section className={'watch-out '+(expanded?'expanded':'')} aria-labelledby={label+'-heading'}>
 <div className="watch-heading"><span className="watch-icon"><CircleHelp size={21}/></span><div><h3 id={label+'-heading'}>Watch out for</h3><p>{text}</p></div></div>
 <div className="watch-tools"><span>Choose a cue to compare</span><button type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?<Minimize2 size={14}/>:<Maximize2 size={14}/>} {expanded?'Compact view':'Larger view'}</button></div>
 <div className="cue-buttons" role="group" aria-label="Illustrated form cues">{cues.map((c,i)=><button type="button" key={c.kind} aria-pressed={selected===i} className={selected===i?'active':''} onClick={()=>setSelected(i)}>{c.label}</button>)}</div>
 <div className="form-comparison" aria-live="polite" aria-atomic="true">{[true,false].map(bad=><figure className={bad?'avoid-example':'aim-example'} key={String(bad)}><div className="example-label">{bad?<X size={14}/>:<Check size={14}/>}<span>{bad?'Avoid':'Aim for'}</span></div><div className="warning-art"><WarningDiagram id={id} cue={cue} bad={bad} label={label+(bad?'-avoid':'-aim')}/></div><figcaption>{bad?cue.avoid:cue.aim}</figcaption></figure>)}</div>
 <p className="cue-tip"><span className="cue-tip-marker"/>{cue.tip}</p>
 <div className="watch-note">Illustrations highlight one cue at a time. They are not exact joint angles or a form assessment. Stop for pain and ask for help with an unfamiliar setup.</div>
 </section>
}
