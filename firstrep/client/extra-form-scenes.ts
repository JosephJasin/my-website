import { extraMovementPose, isFlyMotion } from './extra-motion-model';
import type { CueKind } from './form-cues';
import { joint, type Point, type Pose } from './movement-model';
const plus=(p:Point,x:number,y:number):Point=>[p[0]+x,p[1]+y];
const midway=(a:Point,b:Point):Point=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
function rotate(p:Point,c:Point,degrees:number):Point{const a=degrees*Math.PI/180,x=p[0]-c[0],y=p[1]-c[1];return [c[0]+x*Math.cos(a)-y*Math.sin(a),c[1]+x*Math.sin(a)+y*Math.cos(a)]}
export function extraCueScene(id:string,kind:CueKind,bad:boolean){
 const phase=kind==='row-arms'?.12:kind==='row-recovery'?.45:kind==='fly-range'?(id==='pec-fly'?0:.5):kind==='hip-width'?(id==='hip-abduction'?.5:0):.35;
 const base=extraMovementPose(id,phase),p=JSON.parse(JSON.stringify(base)) as Pose;
 let focus:Point=p.shoulder,view=isFlyMotion(id)?'85 40 310 255':id==='rowing-erg'?'85 70 330 230':'110 40 270 260';
 if(kind==='shrug'){
  if(bad){p.shoulder=plus(p.shoulder,0,-15);p.otherShoulder=plus(p.otherShoulder!,0,-15);p.elbow=plus(p.elbow,0,-10);p.farElbow=plus(p.farElbow!,0,-10)}
  focus=p.shoulder;
 }
 if(kind==='torso-swing'){
  if(bad){
   if(id==='elliptical'){
    p.shoulder=plus(p.shoulder,38,15);p.head=plus(p.head,45,15);
    p.elbow=joint(p.shoulder,p.wrist,43,43,1);p.farElbow=joint(p.shoulder,p.farWrist!,43,43,1);
   }else if(id==='face-pull'||id==='dumbbell-lateral-raise'){
    const center:Point=id==='face-pull'?p.hip:[240,185];
    for(const key of ['shoulder','otherShoulder','head','elbow','wrist','farElbow','farWrist'] as const)if(p[key])p[key]=rotate(p[key]!,center,-18);
   }else{p.shoulder=plus(p.shoulder,-24,-4);p.otherShoulder=plus(p.otherShoulder!,-24,-4);p.head=plus(p.head,-31,-2);p.elbow=plus(p.elbow,-12,0);p.farElbow=plus(p.farElbow!,-12,0)}
  }
  focus=midway(p.hip,p.shoulder);
 }
 if(kind==='neck'){if(bad)p.head=plus(p.head,27,8);focus=p.head;}
 if(kind==='fly-range'){
  if(bad){p.wrist=[145,226];p.farWrist=[335,226];p.elbow=[174,203];p.farElbow=[306,203]}
  focus=p.wrist;
 }
 if(kind==='elbow-lock'){
  if(bad){p.elbow=midway(p.shoulder,p.wrist);p.farElbow=midway(p.otherShoulder!,p.farWrist!)}
  focus=p.elbow;
 }
 if(kind==='fly-row'){
  if(bad){p.wrist=[215,189];p.farWrist=[265,189];p.elbow=[173,220];p.farElbow=[307,220]}
  focus=p.elbow;
 }
 if(kind==='hip-width'){
  if(bad){p.knee=plus(p.knee,-34,-12);p.farKnee=plus(p.farKnee!,34,-12);p.ankle=plus(p.ankle,-34,0);p.farAnkle=plus(p.farAnkle!,34,0)}
  focus=p.knee;view='100 70 280 230';
 }
 if(kind==='row-arms'){
  if(bad){p.wrist=plus(p.wrist,-30,-8);p.elbow=plus(p.shoulder,12,42)}
  focus=p.elbow;
 }
 if(kind==='row-recovery'){
  if(bad)p.knee=[226,193];
  focus=p.knee;
 }
 return {base,p,machine:p,focus,view,phase};
}
