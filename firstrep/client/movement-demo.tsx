'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { isFreeWeight, movementInfo, movementPose, type Point, type Pose } from './movement-model';
import { isExtraMotion, isFrontMotion, isFlyMotion, rowingStage } from './extra-motion-model';
import { ExtraEquipment, ExtraFigure } from './extra-motion-art';
const points=(ps:Point[])=>ps.map(p=>p.join(',')).join(' ');
function Line({from,to,...props}:{from:Point;to:Point}&Omit<React.SVGProps<SVGLineElement>,'from'|'to'>){return <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} {...props}/>}
export function Equipment({id,p,phase}:{id:string;p:Pose;phase:number}){
 if(isExtraMotion(id))return <ExtraEquipment id={id} p={p}/>;
 if(isFreeWeight(id))return <FreeWeightEquipment id={id} p={p}/>;
 const stack=<g><rect x="351" y="87" width="51" height="193" rx="7" fill="#293426" strokeWidth="3"/><path d="M364 100V264M389 100V264" strokeWidth="2"/>{[0,1,2,3,4,5,6].map(i=><rect key={i} x="360" y={210+i*8} width="34" height="6" rx="2" fill="#53634b" stroke="none"/>)}</g>;
 const seat=(x:number,y:number)=><g><path d={`M${x+10} ${y+8}V280M${x-12} 280H${x+72}`} strokeWidth="7"/><rect x={x} y={y} width="68" height="12" rx="5" fill="#526249" stroke="none"/></g>;
 return <g className="motion-machine" stroke="#506047" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6">
 <path d="M70 284H423" strokeWidth="2" stroke="#3d4b36"/>
 {id==='treadmill'?<g><path d="M130 278H344L361 143M342 161H381" strokeWidth="9"/><rect x="337" y="115" width="55" height="28" rx="4" fill="#42513b" stroke="none"/><path d="M336 151L292 164"/>{[0,1,2,3,4,5,6].map(i=><path key={i} d={`M${139+((i*28+phase*196)%196)} 278h10`} stroke="#7a8b6a" strokeWidth="2"/>)}</g>:
 id==='bike'?<g><path d={`M162 281H303M194 278L${p.hip[0]+8} ${p.hip[1]+12}M208 229L276 269M276 269L292 123L265 118`} strokeWidth="7"/><path d={`M${p.hip[0]-14} ${p.hip[1]+8}H${p.hip[0]+18}`} strokeWidth="10"/><ellipse cx="259" cy="255" rx="32" ry="25" fill="#293725"/><circle cx="246" cy="238" r="26" strokeWidth="3"/><Line from={p.farAnkle!} to={p.ankle} stroke="#9aaa88" strokeWidth="4"/></g>:
 id==='leg-press'?<g>{seat(126,216)}<path d="M146 214L112 135" strokeWidth="16"/><path d="M177 244H330M280 244L300 278"/><Line from={[p.ankle[0]+12,p.ankle[1]-22]} to={[p.ankle[0]+24,p.ankle[1]+24]} strokeWidth="12"/><Line from={[p.ankle[0]+18,p.ankle[1]+9]} to={[p.ankle[0]+35,244]}/><rect x="321" y="187" width="45" height="60" rx="5" fill="#293426"/></g>:
 id.startsWith('cable-')?<g>{stack}<path d="M352 100V48H302V273H352" strokeWidth="5"/><circle cx="302" cy={id==='cable-triceps'?56:268} r="8" fill="#293426" strokeWidth="3"/><Line from={[302,id==='cable-triceps'?56:268]} to={p.wrist} stroke="#889877" strokeWidth="2"/></g>:
 <g>{stack}{seat(p.hip[0]-13,p.hip[1]+9)}
 {id!=='seated-row'&&<Line from={[p.hip[0]-12,p.hip[1]+4]} to={[p.shoulder[0]-15,p.shoulder[1]+6]} strokeWidth="14"/>}
 {id==='leg-curl'||id==='leg-extension'?<g><circle cx="267" cy="186" r="8" fill="#33422b" strokeWidth="3"/><Line from={p.knee} to={p.ankle} strokeWidth="8"/><rect x={p.ankle[0]-13} y={p.ankle[1]-3} width="27" height="12" rx="5" fill="#71865d" stroke="none"/>{id==='leg-curl'&&<path d="M243 173H270" strokeWidth="12"/>}</g>:
 id==='lat-pulldown'?<g><path d="M369 95V39H275V47" strokeWidth="6"/><circle cx="275" cy="47" r="6" strokeWidth="3"/><Line from={[275,47]} to={p.wrist} strokeWidth="2" stroke="#889877"/><Line from={[p.wrist[0]-22,p.wrist[1]]} to={[p.wrist[0]+19,p.wrist[1]+4]} strokeWidth="5"/><path d="M247 207H277" strokeWidth="11"/></g>:
 id==='seated-row'?<g><Line from={[351,248]} to={p.wrist} strokeWidth="2" stroke="#889877"/><path d="M312 269L328 248" strokeWidth="8"/></g>:
 id==='abdominal-crunch'?<g><path d={`M350 176L${p.wrist[0]+10} ${p.wrist[1]+9}`} strokeWidth="5"/><Line from={[p.wrist[0]-9,p.wrist[1]+2]} to={[p.wrist[0]+8,p.wrist[1]-7]} strokeWidth="13"/></g>:
 <g><Line from={[340,id==='shoulder-press'?70:110]} to={p.wrist} strokeWidth="5"/><Line from={p.wrist} to={[p.wrist[0],p.wrist[1]+15]} strokeWidth="7"/></g>}
 </g>}
 </g>
}
function FreeWeightEquipment({id,p}:{id:string;p:Pose}){
 const dumbbell=(at:Point,angle=0,opacity=1)=><g transform={`translate(${at[0]} ${at[1]}) rotate(${angle})`} opacity={opacity}><path d="M-15 0H15" stroke="#a8b79a" strokeWidth="5"/><rect x="-21" y="-11" width="9" height="22" rx="3"/><rect x="12" y="-11" width="9" height="22" rx="3"/></g>;
 return <g fill="#526449" stroke="#81956e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M70 284H423" stroke="#3d4b36"/>
  {id==='dumbbell-row'&&<g><path d="M298 210V279M367 210V279M286 279H312M354 279H380" stroke="#506047" strokeWidth="7"/><rect x="278" y="201" width="106" height="12" rx="5"/></g>}
  {(id==='dumbbell-bench-press'||id==='barbell-bench-press')&&<g><path d="M164 218V279M270 218V279M150 279H179M255 279H285" stroke="#506047" strokeWidth="7"/><rect x="132" y="207" width="158" height="13" rx="5"/></g>}
  {id==='barbell-bench-press'&&<g fill="none"><path d="M116 280V51H352V280M100 280H132M336 280H368" stroke="#506047" strokeWidth="6"/><path d="M116 119H169V109" stroke="#a3b78e" strokeWidth="6"/><path d="M116 198H352" stroke="#91a57e" strokeWidth="6"/>{[83,145,168,221,245].map(y=><circle key={y} cx="116" cy={y} r="2" fill="#c1cbb9" stroke="none"/>)}</g>}
  {id==='barbell-bench-press'?<g><circle cx={p.wrist[0]} cy={p.wrist[1]} r="14" fill="#526449" stroke="#b3c3a4" strokeWidth="3"/><circle cx={p.wrist[0]} cy={p.wrist[1]} r="4" fill="#c3ee74" stroke="none"/></g>:id.startsWith('barbell-')?<g><Line from={[p.wrist[0]-75,p.wrist[1]]} to={[p.wrist[0]+75,p.wrist[1]]} stroke="#b3c3a4" strokeWidth="5"/>{[-57,51].map(x=><g key={x}><rect x={p.wrist[0]+x} y={p.wrist[1]-17} width="8" height="34" rx="3"/><rect x={p.wrist[0]+x+(x<0?-5:9)} y={p.wrist[1]-6} width="4" height="12" fill="#c3ee74" stroke="none"/></g>)}</g>:
  id==='kettlebell-deadlift'?<g><path d={`M${p.wrist[0]-10} ${p.wrist[1]+13}q-6-22 10-22t10 22`} fill="none" strokeWidth="5"/><ellipse cx={p.wrist[0]} cy={p.wrist[1]+18} rx="18" ry="16"/></g>:
  id==='goblet-squat'?dumbbell([p.wrist[0],p.wrist[1]+9],90):<>{id!=='dumbbell-row'&&dumbbell(p.farWrist??[p.wrist[0]-8,p.wrist[1]+1],0,.55)}{dumbbell(p.wrist)}</>}
 </g>;
}
export function Figure({id,p,tint}:{id:string;p:Pose;tint?:string}){
 if(isFrontMotion(id)||isFlyMotion(id))return <ExtraFigure id={id} p={p} tint={tint}/>;
 const info=movementInfo[id],tone='#e7eddf',accent=tint??'#c3ee74';
 const far=(pnt:Point):Point=>[pnt[0]-8,pnt[1]+1];
 const neck:Point=[p.shoulder[0]+(p.head[0]-p.shoulder[0])*.4,p.shoulder[1]+(p.head[1]-p.shoulder[1])*.4];
 return <g fill="none" strokeLinecap="round" strokeLinejoin="round">
 <polyline points={points([p.hip,p.farKnee??far(p.knee),p.farAnkle??far(p.ankle)])} stroke="#73856b" strokeWidth="8"/>
 <polyline points={points([p.shoulder,p.farElbow??far(p.elbow),p.farWrist??far(p.wrist)])} stroke="#73856b" strokeWidth="7"/>
 <polyline points={points([...(p.spine??[p.hip,p.shoulder]),neck])} stroke={tone} strokeWidth="10"/>
 <polyline points={points([p.hip,p.knee,p.ankle])} stroke={tone} strokeWidth="8"/>
 <polyline points={points([p.shoulder,p.elbow,p.wrist])} stroke={tone} strokeWidth="8"/>
 <Line from={p.ankle} to={p.toe??[p.ankle[0]+14,p.ankle[1]+2]} stroke={tone} strokeWidth="7"/>
 {p.farAnkle&&<Line from={p.farAnkle} to={[p.farAnkle[0]+13,p.farAnkle[1]+2]} stroke="#73856b" strokeWidth="7"/>}
 <circle cx={p.head[0]} cy={p.head[1]} r="12" fill={tone} stroke="none"/>
 {info.muscle==='legs'&&<Line from={[p.hip[0]*.75+p.knee[0]*.25,p.hip[1]*.75+p.knee[1]*.25]} to={[p.hip[0]*.2+p.knee[0]*.8,p.hip[1]*.2+p.knee[1]*.8]} stroke={accent} strokeWidth="9"/>}
 {['arms','shoulders','chest'].includes(info.muscle)&&<Line from={p.shoulder} to={[p.shoulder[0]*.25+p.elbow[0]*.75,p.shoulder[1]*.25+p.elbow[1]*.75]} stroke={accent} strokeWidth="9"/>}
 {['back','core'].includes(info.muscle)&&<polyline points={points(info.muscle==='core'?(p.spine??[p.hip,p.shoulder]).slice(0,3):(p.spine??[p.shoulder,[p.shoulder[0]*.4+p.hip[0]*.6,p.shoulder[1]*.4+p.hip[1]*.6]]))} stroke={accent} strokeWidth="10"/>}
 {[p.hip,p.shoulder,p.elbow,p.knee].map((pt,i)=><circle key={i} cx={pt[0]} cy={pt[1]} r="3" fill="#25321f" stroke="none"/>)}
 </g>
}
export function MovementFrame({id,phase,label}:{id:string;phase:number;label:string}){const p=movementPose(id,phase);return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320" role="img" aria-labelledby={label}><title id={label}>{movementInfo[id].example + ': animated movement sketch'}</title><Equipment id={id} p={p} phase={phase}/><Figure id={id} p={p}/></svg>}
export default function MovementDemo({id,name,compact=false,autoPlay=true}:{id:string;name:string;compact?:boolean;autoPlay?:boolean}){
 const [phase,setPhase]=useState(0),[playing,setPlaying]=useState(true),[speed,setSpeed]=useState(1),[visible,setVisible]=useState(false);
 const container=useRef<HTMLDivElement>(null),position=useRef(0),label=useId(),info=movementInfo[id];
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');setPlaying(!media.matches&&(compact?autoPlay:true));const update=()=>setPlaying(!media.matches&&(compact?autoPlay:true));media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[autoPlay,compact]);
 useEffect(()=>{const io=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.15});if(container.current)io.observe(container.current);return()=>io.disconnect()},[]);
 useEffect(()=>{if(!playing||!visible)return;let handle=0,last=0,lastPaint=0;const cycle=(id==='treadmill'||id==='bike'||id==='elliptical'?2600:id==='rowing-erg'?6500:4800)/speed;
 const frame=(now:number)=>{if(!last)last=now;const elapsed=Math.min(now-last,80);last=now;if(document.visibilityState==='visible'){position.current=(position.current+elapsed/cycle)%1;if(now-lastPaint>40){setPhase(position.current);lastPaint=now;}}handle=requestAnimationFrame(frame)};
 handle=requestAnimationFrame(frame);return()=>cancelAnimationFrame(handle);
 },[playing,visible,speed,id]);
 function scrub(value:number){setPlaying(false);position.current=value;setPhase(value)}
 return <div ref={container} className={'movement-demo '+(compact?'compact':'full')} aria-label={`${name} movement illustration`}>
 <div className="motion-stage"><MovementFrame id={id} phase={phase} label={label}/><span className="motion-badge">{compact?'MOVEMENT PREVIEW':isFlyMotion(id)?'OVERHEAD VIEW · FACING UP':'MOVEMENT SKETCH'}</span>{!compact&&<span className="motion-phase">{id==='rowing-erg'?rowingStage(phase):phase<.5?info.out:info.back}</span>}</div>
 {!compact&&<><div className="motion-controls"><button type="button" className="button secondary small" onClick={()=>setPlaying(v=>!v)} aria-label={playing?'Pause animation':'Play animation'}>{playing?<Pause size={15}/>:<Play size={15}/>} {playing?'Pause':'Play'}</button><button type="button" className="motion-restart" aria-label="Restart animation" onClick={()=>{position.current=0;setPhase(0)}}><RotateCcw size={17}/></button><label className="motion-speed">Speed<select aria-label="Animation speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.5}>0.5× · Slow</option><option value={1}>1× · Normal</option></select></label></div><label className="motion-scrubber">Inspect the movement<input type="range" aria-label="Movement position" min="0" max="100" step="1" value={Math.round(phase*100)} onChange={e=>scrub(Number(e.target.value)/100)}/></label><div className="motion-caption"><strong>{info.example}</strong><p>{info.cue}</p><small>Simplified motion, not exact joint angles or a prescribed range. Follow the setup below and the equipment instructions.</small></div></>}
 </div>
}
