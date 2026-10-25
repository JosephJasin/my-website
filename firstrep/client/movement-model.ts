// Schematic side-view poses, not model-specific setup or prescribed joint angles.
export type Point=[number,number];
export type Pose={hip:Point;shoulder:Point;head:Point;elbow:Point;wrist:Point;knee:Point;ankle:Point;farKnee?:Point;farAnkle?:Point;farElbow?:Point;farWrist?:Point;spine?:Point[];pedal?:Point};
export type MovementInfo={out:string;back:string;example:string;cue:string;muscle:'legs'|'arms'|'back'|'chest'|'shoulders'|'core'|'cardio'};
export const movementInfo:Record<string,MovementInfo>={
 'bike':{out:'Pedal smoothly',back:'Pedal smoothly',example:'Upright bike',cue:'Stay relaxed; keep a slight knee bend at the bottom.',muscle:'cardio'},
 'leg-press':{out:'Press away',back:'Return slowly',example:'Seated leg press',cue:'Keep hips supported and stop short of locking your knees.',muscle:'legs'},
 'chest-press':{out:'Press forward',back:'Return slowly',example:'Seated chest press',cue:'Keep wrists straight and your back on the pad.',muscle:'chest'},
 'seated-row':{out:'Pull toward your ribs',back:'Reach forward slowly',example:'Low cable row',cue:'Move your arms without rocking your torso.',muscle:'back'},
 'lat-pulldown':{out:'Pull down in front',back:'Return overhead slowly',example:'High-pulley lat pulldown',cue:'Pull in front of your head; keep your torso steady.',muscle:'back'},
 'leg-curl':{out:'Curl down and back',back:'Return slowly',example:'Seated leg curl · combined-machine example',cue:'This shows a seated model. Lying models use a different setup.',muscle:'legs'},
 'leg-extension':{out:'Straighten your legs',back:'Lower slowly',example:'Seated leg extension',cue:'Align your knees with the pivot; don’t snap them straight.',muscle:'legs'},
 'shoulder-press':{out:'Press overhead',back:'Lower slowly',example:'Seated shoulder press',cue:'Keep your back supported; use a comfortable, pain-free range.',muscle:'shoulders'},
 'abdominal-crunch':{out:'Gently curl your ribs down',back:'Uncurl slowly',example:'Seated abdominal crunch',cue:'Use a small curl, not a big forward swing.',muscle:'core'},
 'cable-triceps':{out:'Press down',back:'Return slowly',example:'High cable · triceps pushdown',cue:'Keep your upper arms still beside your torso.',muscle:'arms'},
 'cable-curl':{out:'Curl upward',back:'Lower slowly',example:'Low cable · biceps curl',cue:'Keep your elbows close and avoid leaning back.',muscle:'arms'},
 'treadmill':{out:'Walk at an easy pace',back:'Walk at an easy pace',example:'Flat treadmill walking',cue:'Start slowly and stop the belt before stepping off.',muscle:'cardio'},
};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const polar=(p:Point,length:number,angle:number):Point=>[p[0]+length*Math.cos(angle),p[1]+length*Math.sin(angle)];
export function joint(a:Point,b:Point,l1:number,l2:number,bend=1):Point{
 const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);
 const distance=Math.max(.001,Math.min(d,l1+l2-.001));
 const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
 const height=Math.sqrt(Math.max(0,l1*l1-along*along));
 return [a[0]+dx/d*along-dy/d*height*bend,a[1]+dy/d*along+dx/d*height*bend];
}
export function movementPose(id:string,phase:number):Pose{
 const a=phase*Math.PI*2,t=(1-Math.cos(a))/2;
 let hip:Point=[210,216],shoulder:Point=[210,139],head:Point=[210,108],wrist:Point=[245,145],knee:Point=[265,216],ankle:Point=[265,272];
 let elbow:Point|undefined,extras:Partial<Pose>={};
 if(id==='chest-press')wrist=[mix(247,309,t),145];
 if(id==='seated-row'){wrist=[mix(310,242,t),mix(149,168,t)];ankle=[318,263];}
 if(id==='lat-pulldown'){hip=[225,220];shoulder=[225,143];head=[225,112];wrist=[275,mix(62,149,t)];knee=[280,220];ankle=[280,273];}
 if(id==='shoulder-press')wrist=[248,mix(137,58,t)];
 if(id==='leg-press'){
  hip=[150,208];shoulder=[123,141];head=[112,113];ankle=[mix(230,280,t),mix(190,172,t)];knee=joint(hip,ankle,70,70,-1);wrist=[165,224];
 }
 if(id==='leg-curl'||id==='leg-extension'){
  hip=[202,186];shoulder=[188,117];head=[183,88];knee=[267,186];
  ankle=polar(knee,63,(id==='leg-curl'?mix(14,103,t):mix(92,14,t))*Math.PI/180);wrist=[217,200];
 }
 if(id==='abdominal-crunch'){
  hip=[209,218];shoulder=[mix(208,238,t),mix(139,155,t)];head=[shoulder[0]+mix(-2,8,t),shoulder[1]-29];wrist=[mix(250,273,t),mix(165,185,t)];
  extras.spine=[hip,[213,188],[mix(209,221,t),170],shoulder];
 }
 if(id==='cable-triceps'||id==='cable-curl'){
  hip=[225,201];shoulder=[225,122];head=[225,91];knee=[220,238];ankle=[219,274];
  elbow=[233,169];wrist=polar(elbow,50,(id==='cable-triceps'?mix(-30,78,t):mix(78,-46,t))*Math.PI/180);
  extras.farKnee=[242,239];extras.farAnkle=[248,274];
 }
 if(id==='bike'){
  hip=[202,173];shoulder=[218,109];head=[225,79];wrist=[273,124];
  const pedal:Point=[246,238];ankle=polar(pedal,23,a);const farAnkle=polar(pedal,23,a+Math.PI);
  knee=joint(hip,ankle,62,65,-1);extras={farAnkle,farKnee:joint(hip,farAnkle,62,65,-1),pedal};
 }
 if(id==='treadmill'){
  hip=[222,184];shoulder=[222,115];head=[222,84];
  ankle=[222+34*Math.sin(a),269-15*Math.max(0,-Math.cos(a))];
  const farAnkle:Point=[222+34*Math.sin(a+Math.PI),269-15*Math.max(0,-Math.cos(a+Math.PI))];
  knee=joint(hip,ankle,47,47,-1);wrist=[234-24*Math.sin(a),177];
  const farWrist:Point=[234+24*Math.sin(a),177];
  extras={farAnkle,farKnee:joint(hip,farAnkle,47,47,-1),farWrist,farElbow:joint(shoulder,farWrist,38,38,-1)};
  elbow=joint(shoulder,wrist,38,38,-1);
 }
 return {hip,shoulder,head,wrist,knee,ankle,elbow:elbow??joint(shoulder,wrist,51,51,1),...extras};
}
