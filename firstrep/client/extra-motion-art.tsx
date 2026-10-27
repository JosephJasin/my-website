import type { Point, Pose } from './movement-model';
import { isFlyMotion } from './extra-motion-model';
const line=(a:Point,b:Point)=>`M${a.join(' ')}L${b.join(' ')}`;
const path=(ps:Point[])=>ps.map(p=>p.join(',')).join(' ');
export function ExtraEquipment({id,p}:{id:string;p:Pose}){
 const fly=isFlyMotion(id),hip=id.startsWith('hip-');
 return <g fill="none" stroke="#607650" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
 <path d="M70 284H423" stroke="#3d4b36" strokeWidth="2"/>
 {id==='elliptical'&&<><path d="M115 280H355M310 277L320 113L290 103" strokeWidth="7"/><ellipse cx="147" cy="250" rx="36" ry="29" fill="#293725"/><circle cx="147" cy="250" r="17" strokeWidth="2"/><rect x="300" y="83" width="45" height="29" rx="4" fill="#293426" strokeWidth="3"/><path d="M313 143L290 128M307 137L280 122" stroke="#a3b78e" strokeWidth="7"/>{[p.farAnkle!,p.ankle].map((foot,i)=><g key={i} opacity={i===0?.55:1}><path d={`M147 250L${foot[0]+8} ${foot[1]+8}L337 275`} strokeWidth="5"/><path d={`M${foot[0]-12} ${foot[1]+6}h40`} stroke="#a3b78e" strokeWidth="8"/></g>)}</>}
 {id==='dumbbell-lateral-raise'&&[p.wrist,p.farWrist!].map((w,i)=><g key={i} transform={`translate(${w.join(' ')})`}><path d="M-12 0H12" stroke="#b9c6ad"/><rect x="-19" y="-10" width="8" height="20" rx="2" fill="#526449" strokeWidth="2"/><rect x="11" y="-10" width="8" height="20" rx="2" fill="#526449" strokeWidth="2"/></g>)}
 {id==='face-pull'&&<><rect x="360" y="75" width="42" height="205" rx="6" fill="#293426"/><path d="M374 90V260M388 90V260" strokeWidth="2"/><circle cx="346" cy="93" r="9" fill="#293426"/><path d={`M360 93H346L${p.wrist[0]+16} ${p.wrist[1]-4}`} stroke="#a4b58f" strokeWidth="2"/><path d={`M${p.wrist.join(' ')}L${p.wrist[0]+16} ${p.wrist[1]-4}L${p.farWrist!.join(' ')}`} stroke="#c9d3bf" strokeWidth="4"/></>}
 {fly&&<><rect x="207" y="186" width="66" height="49" rx="10" fill="#303d29" strokeWidth="3"/><rect x="200" y={id==='pec-fly'?225:161} width="80" height="12" rx="5" fill="#6c8059" stroke="none"/><path d={`M104 214L${p.wrist.join(' ')}M376 214L${p.farWrist!.join(' ')}`} strokeWidth="5"/><circle cx="104" cy="214" r="8" fill="#2a3524"/><circle cx="376" cy="214" r="8" fill="#2a3524"/><path d="M104 214V260H376V214" strokeWidth="3"/>{[p.wrist,p.farWrist!].map((w,i)=><path key={i} d={`M${w[0]} ${w[1]-6}v12`} stroke="#b7c99e" strokeWidth="8"/>)}<text x="240" y="54" textAnchor="middle" fontFamily="sans-serif" fontSize="10" letterSpacing="1" fill="#b6c9a4" stroke="none">{id==='pec-fly'?'TOP VIEW · BACK AGAINST PAD':'TOP VIEW · CHEST AGAINST PAD'}</text></>}
 {hip&&<><rect x="212" y="109" width="56" height="89" rx="9" fill="#33422c" strokeWidth="3"/><rect x="205" y="192" width="70" height="16" rx="6" fill="#53684a" strokeWidth="3"/><path d="M215 209V278M265 209V278M196 278H283"/><path d={`M240 201L${p.knee.join(' ')}M240 201L${p.farKnee!.join(' ')}`} strokeWidth="7"/>{[p.knee,p.farKnee!].map((k,i)=><rect key={i} x={k[0]+(id==='hip-abduction'?(i===0?-14:6):(i===0?6:-14))} y={k[1]-16} width="8" height="28" rx="4" fill="#a1ba85" stroke="none"/>)}{[p.ankle,p.farAnkle!].map((a,i)=><path key={i} d={`M${a[0]-11} 280h22`} strokeWidth="8"/>)}<text x="240" y="54" textAnchor="middle" fontFamily="sans-serif" fontSize="10" letterSpacing="1" fill="#c3d5b2" stroke="none">{id==='hip-abduction'?'OUTSIDE PADS · PUSH OUT':'INSIDE PADS · BRING IN'}</text></>}
 {id==='rowing-erg'&&<><path d="M100 247H329M117 249V280M325 249V280" strokeWidth="7"/><rect x={p.hip[0]-20} y="226" width="42" height="12" rx="5" fill="#71865d" strokeWidth="2"/><circle cx="382" cy="244" r="33" fill="#293725"/><circle cx="382" cy="244" r="23" strokeWidth="2"/><path d="M305 252L287 267M309 248L311 152H340"/><rect x="306" y="130" width="37" height="24" rx="3" fill="#3f5133" strokeWidth="2"/><path d={`M367 236L${p.wrist.join(' ')}`} stroke="#a5b993" strokeWidth="2"/><path d={`M${p.wrist[0]-5} ${p.wrist[1]-4}l12 9`} stroke="#d7e2ce" strokeWidth="7"/><path d="M280 266l12-9" stroke="#c3ee74" strokeWidth="4"/></>}
 </g>;
}
export function ExtraFigure({id,p,tint}:{id:string;p:Pose;tint?:string}){
 const fly=isFlyMotion(id),tone='#e7eddf',accent=tint??'#c3ee74';
 const s2=p.otherShoulder!,h2=p.otherHip!;
 return <g fill="none" strokeLinecap="round" strokeLinejoin="round">
 {!fly&&<><polyline points={path([p.hip,p.knee,p.ankle])} stroke={tone} strokeWidth="9"/><polyline points={path([h2,p.farKnee!,p.farAnkle!])} stroke={tone} strokeWidth="9"/><path d={line(p.ankle,p.toe??[p.ankle[0]-8,p.ankle[1]+3])+' '+line(p.farAnkle!,[p.farAnkle![0]+8,p.farAnkle![1]+3])} stroke={tone} strokeWidth="8"/></>}
 <>{fly?<ellipse cx="240" cy="198" rx="31" ry="24" fill="#a6b799" stroke={tone} strokeWidth="5"/>:<path d={`M${p.hip.join(' ')}L${p.shoulder.join(' ')}L${s2.join(' ')}L${h2.join(' ')}Z`} fill="#b7c5aa" stroke={tone} strokeWidth="5"/>}</>
 {!fly&&<path d={`M${(p.shoulder[0]+s2[0])/2} ${(p.shoulder[1]+s2[1])/2}L${p.head.join(' ')}`} stroke={tone} strokeWidth="9"/>}
 <polyline points={path([p.shoulder,p.elbow,p.wrist])} stroke={tone} strokeWidth="8"/><polyline points={path([s2,p.farElbow!,p.farWrist!])} stroke={tone} strokeWidth="8"/>
 {id==='dumbbell-lateral-raise'||id==='rear-delt-fly'?<><path d={line(p.shoulder,p.elbow)} stroke={accent} strokeWidth="9"/><path d={line(s2,p.farElbow!)} stroke={accent} strokeWidth="9"/></>:id==='pec-fly'?<path d={`M${p.shoulder[0]+7} ${p.shoulder[1]+13}H${s2[0]-7}`} stroke={accent} strokeWidth="10"/>:<><path d={line(p.hip,p.knee)} stroke={accent} strokeWidth="9"/><path d={line(h2,p.farKnee!)} stroke={accent} strokeWidth="9"/></>}
 <circle cx={p.head[0]} cy={p.head[1]} r={fly?15:13} fill={tone}/>
 {fly&&<path d={`M${p.head[0]-4} ${p.head[1]-13}l4-5 4 5`} fill={tone} stroke={tone} strokeWidth="2"/>}
 {[p.shoulder,s2,p.elbow,p.farElbow!,p.knee,p.farKnee!].filter((_,i)=>!fly||i<4).map((point,i)=><circle key={i} cx={point[0]} cy={point[1]} r="3" fill="#25321f"/>)}
 </g>;
}
