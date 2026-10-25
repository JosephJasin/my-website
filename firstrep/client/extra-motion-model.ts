import type { Point, Pose } from './movement-model';
export const extraMotionIds=['dumbbell-lateral-raise','face-pull','pec-fly','rear-delt-fly','hip-abduction','hip-adduction','rowing-erg'];
export const isExtraMotion=(id:string)=>extraMotionIds.includes(id);
export const isFrontMotion=(id:string)=>['dumbbell-lateral-raise','hip-abduction','hip-adduction'].includes(id);
export const isFlyMotion=(id:string)=>id==='pec-fly'||id==='rear-delt-fly';
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const lerp=(a:Point,b:Point,t:number):Point=>[mix(a[0],b[0],t),mix(a[1],b[1],t)];
const mirror=(p:Point):Point=>[480-p[0],p[1]];
export function extraMovementPose(id:string,phase:number):Pose {
 const t=(1-Math.cos(phase*Math.PI*2))/2;
 if(id==='rowing-erg'){
  const catchPose:Pose={hip:[225,215],shoulder:[262,144],head:[275,118],knee:[296,214],ankle:[286,267],wrist:[338,170],elbow:[300,157]};
  const legs:Pose={...catchPose,hip:[146,215],shoulder:[183,144],head:[196,118],knee:[216,240],wrist:[259,170],elbow:[221,157]};
  const body:Pose={...legs,shoulder:[127,136],head:[120,107],wrist:[211,158],elbow:[169,147]};
  const finish:Pose={...body,wrist:[165,175],elbow:[121,184]};
  const frames=[{at:0,p:catchPose},{at:.24,p:legs},{at:.32,p:body},{at:.4,p:finish},{at:.53,p:body},{at:.65,p:legs},{at:1,p:catchPose}];
  const index=Math.max(1,frames.findIndex(f=>f.at>=phase));
  const a=frames[index-1],b=frames[index],u=(phase-a.at)/(b.at-a.at);
  const result={...a.p};
  for(const key of ['hip','shoulder','head','knee','ankle','elbow','wrist'] as const)result[key]=lerp(a.p[key],b.p[key],u);
  return result;
 }
 if(id==='face-pull')return {hip:[225,201],shoulder:[225,122],head:[225,91],knee:[220,239],ankle:[215,275],farKnee:[243,239],farAnkle:[253,275],elbow:[273,mix(118,133,t)],wrist:[mix(322,247,t),mix(114,105,t)],farElbow:[268,mix(112,125,t)],farWrist:[mix(317,242,t),mix(108,98,t)]};
 if(isFlyMotion(id)){
  const opening=id==='rear-delt-fly'?t:1-t;
  const wrist:Point=[mix(224,145,opening),mix(92,163,opening)];
  return {hip:[225,221],otherHip:[255,221],shoulder:[216,175],otherShoulder:[264,175],head:[240,193],elbow:[mix(195,174,opening),mix(128,160,opening)],wrist,farElbow:[mix(285,306,opening),mix(128,160,opening)],farWrist:mirror(wrist),knee:[209,260],ankle:[205,280],farKnee:[271,260],farAnkle:[275,280]};
 }
 const hip:Point=[225,185],shoulder:Point=[219,105];
 if(id==='dumbbell-lateral-raise'){
  const elbow:Point=[mix(211,175,t),mix(155,115,t)],wrist:Point=[mix(204,137,t),mix(201,120,t)];
  return {hip,otherHip:mirror(hip),shoulder,otherShoulder:mirror(shoulder),head:[240,75],elbow,wrist,farElbow:mirror(elbow),farWrist:mirror(wrist),knee:[223,232],ankle:[215,275],farKnee:[257,232],farAnkle:[265,275]};
 }
 const opening=id==='hip-abduction'?t:1-t,knee:Point=[mix(220,178,opening),mix(229,219,opening)],ankle:Point=[knee[0]-3,273];
 return {hip:[225,192],otherHip:[255,192],shoulder:[219,117],otherShoulder:[261,117],head:[240,87],elbow:[205,159],wrist:[203,202],farElbow:[275,159],farWrist:[277,202],knee,ankle,farKnee:mirror(knee),farAnkle:mirror(ankle)};
}
export function rowingStage(phase:number){
 return phase<.24?'Drive · legs first':phase<.32?'Drive · open the body':phase<.4?'Drive · arms finish':phase<.53?'Return · arms away':phase<.65?'Return · body forward':'Return · then bend the legs';
}
