// Schematic side-view poses, not model-specific setup or prescribed joint angles.
export type Point=[number,number];
export type Pose={hip:Point;shoulder:Point;head:Point;elbow:Point;wrist:Point;knee:Point;ankle:Point;toe?:Point;farKnee?:Point;farAnkle?:Point;farElbow?:Point;farWrist?:Point;spine?:Point[];pedal?:Point;otherShoulder?:Point;otherHip?:Point};
import { extraMovementPose, isExtraMotion } from './extra-motion-model';
export type MovementInfo={out:string;back:string;example:string;cue:string;muscle:'legs'|'arms'|'back'|'chest'|'shoulders'|'core'|'cardio'};
export const movementInfo:Record<string,MovementInfo>={
 'bike':{out:'Pedal smoothly',back:'Pedal smoothly',example:'Upright bike',cue:'Stay relaxed; keep a slight knee bend at the bottom.',muscle:'cardio'},
 'elliptical':{out:'Stride forward smoothly',back:'Stride forward smoothly',example:'Elliptical · fixed grips while learning',cue:'Stand tall with a light grip. Slow down and stop the pedals before stepping off.',muscle:'cardio'},
 'barbell-bench-press':{out:'Press up over your shoulders',back:'Lower with control',example:'Flat barbell bench press · side view',cue:'The bar is seen end-on. Have a trainer check the rack and safeties, and use a capable spotter while learning.',muscle:'chest'},
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
 'dumbbell-curl':{out:'Curl upward',back:'Lower slowly',example:'Standing dumbbell curl',cue:'Move at the elbows while your torso and wrists stay steady.',muscle:'arms'},
 'dumbbell-row':{out:'Row toward your hip',back:'Lower with control',example:'One-hand-supported dumbbell row',cue:'Both feet stay on the floor; one hand supports you on a stable bench.',muscle:'back'},
 'dumbbell-bench-press':{out:'Press upward',back:'Lower comfortably',example:'Flat dumbbell bench press',cue:'Keep head, shoulders and hips supported. Learn the entry and exit with help.',muscle:'chest'},
 'goblet-squat':{out:'Lower comfortably',back:'Stand tall',example:'Dumbbell goblet squat',cue:'Hold the weight close; keep your whole feet planted. Depth is individual.',muscle:'legs'},
 'dumbbell-rdl':{out:'Hinge your hips back',back:'Return to standing',example:'Dumbbell Romanian deadlift',cue:'Keep weights near your legs. Stop the hinge before your back shape changes.',muscle:'legs'},
 'barbell-curl':{out:'Curl upward',back:'Lower slowly',example:'Light barbell curl',cue:'Keep your upper arms close and count the bar in your total weight.',muscle:'arms'},
 'kettlebell-deadlift':{out:'Stand up with the bell',back:'Lower and reset',example:'Two-hand kettlebell deadlift',cue:'Keep the bell close and move through your hips. This is not a swing.',muscle:'legs'},
 'barbell-rdl':{out:'Hinge your hips back',back:'Return to standing',example:'Light barbell Romanian deadlift',cue:'Practise the hinge first; ask for a demonstration of bar setup and handling.',muscle:'legs'},
 'dumbbell-lateral-raise':{out:'Raise out to the sides',back:'Lower slowly',example:'Dumbbell lateral raise · front view',cue:'Keep a soft elbow bend and a quiet torso. Shoulder height is a limit, not a target you must reach.',muscle:'shoulders'},
 'face-pull':{out:'Pull the rope toward your face',back:'Reach forward slowly',example:'High cable face pull · side view',cue:'Separate the rope ends beside your head. Keep your torso and neck steady.',muscle:'back'},
 'pec-fly':{out:'Bring arms together',back:'Open comfortably',example:'Chest fly · overhead view, facing the top',cue:'Back against the pad. This view shows the arm path; use the setup guide for seat height.',muscle:'chest'},
 'rear-delt-fly':{out:'Open your arms outward',back:'Return forward slowly',example:'Rear-delt fly · overhead view, facing the top',cue:'Chest against the pad. Keep a small elbow bend and avoid forcing your arms behind you.',muscle:'shoulders'},
 'hip-abduction':{out:'Push outward',back:'Return inward slowly',example:'Hip abduction · front view',cue:'Pads on the outside of your thighs. Push OUT with your torso supported.',muscle:'legs'},
 'hip-adduction':{out:'Bring inward',back:'Return outward slowly',example:'Hip adduction · front view',cue:'Pads on the inside of your thighs. Bring IN from a comfortable starting width.',muscle:'legs'},
 'rowing-erg':{out:'Legs → body → arms',back:'Arms → body → legs',example:'Rowing ergometer · side view',cue:'Drive with your legs first. On the return, let your hands clear your knees before the seat slides forward.',muscle:'cardio'},
};
export const isFreeWeight=(id:string)=>id.startsWith('dumbbell-')||id.startsWith('barbell-')||id==='goblet-squat'||id==='kettlebell-deadlift';
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
 if(isExtraMotion(id))return extraMovementPose(id,phase);
 const a=phase*Math.PI*2,t=(1-Math.cos(a))/2;
 if(isFreeWeight(id)){
  let hip:Point=[225,184],shoulder:Point=[225,108],head:Point=[225,78],knee:Point=[230,230],ankle:Point=[225,274];
  let elbow:Point=[232,153],wrist:Point=polar(elbow,45,mix(80,-65,t)*Math.PI/180);
  let extra:Partial<Pose>={farKnee:[214,230],farAnkle:[208,274]};
  if(id==='dumbbell-row'){
   hip=[174,188];shoulder=[258,140];head=[284,125];knee=[190,233];ankle=[186,274];
   wrist=[mix(264,217,t),mix(234,199,t)];elbow=joint(shoulder,wrist,50,50,1);
   extra={farKnee:[217,229],farAnkle:[228,274],farWrist:[294,198],farElbow:joint(shoulder,[294,198],40,40,-1)};
  }
  if(id==='dumbbell-bench-press'||id==='barbell-bench-press'){
   hip=[270,196];shoulder=[190,196];head=[155,196];knee=[316,229];ankle=[309,274];
   wrist=id==='barbell-bench-press'?[mix(226,193,t),mix(177,99,t)]:[205,mix(158,99,t)];elbow=joint(shoulder,wrist,51,51,1);
   extra={farKnee:[302,231],farAnkle:[290,274],farWrist:[wrist[0]-9,wrist[1]+2],farElbow:[elbow[0]-9,elbow[1]+2]};
  }
  if(id==='goblet-squat'){
   hip=[mix(225,190,t),mix(184,230,t)];shoulder=[mix(225,218,t),mix(108,160,t)];head=[mix(225,229,t),mix(78,132,t)];
   knee=[mix(230,245,t),mix(230,238,t)];wrist=[shoulder[0]+28,shoulder[1]+28];elbow=[shoulder[0]+19,shoulder[1]+53];
   extra={farKnee:[knee[0]-14,knee[1]+1],farAnkle:[208,274],farWrist:[wrist[0]-7,wrist[1]+2],farElbow:[elbow[0]-8,elbow[1]+1]};
  }
  if(id==='dumbbell-rdl'||id==='barbell-rdl'||id==='kettlebell-deadlift'){
   const h=id==='kettlebell-deadlift'?1-t:t,kettle=id==='kettlebell-deadlift';
   hip=[mix(225,190,h),mix(184,kettle?212:196,h)];shoulder=[mix(225,245,h),mix(108,kettle?172:148,h)];
   const dx=shoulder[0]-hip[0],dy=shoulder[1]-hip[1],length=Math.hypot(dx,dy);
   head=[shoulder[0]+dx/length*30,shoulder[1]+dy/length*30];
   knee=[mix(230,kettle?243:230,h),mix(230,kettle?243:232,h)];
   wrist=[shoulder[0],mix(198,kettle?249:238,h)];elbow=[shoulder[0],(shoulder[1]+wrist[1])/2];
   extra={farKnee:[knee[0]-14,knee[1]+1],farAnkle:[208,274],farWrist:[wrist[0]-8,wrist[1]+1],farElbow:[elbow[0]-8,elbow[1]+1]};
  }
  return {hip,shoulder,head,knee,ankle,elbow,wrist,...extra};
 }
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
