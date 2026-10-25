export type CueKind='knee-lock'|'hip-lift'|'depth'|'wrist'|'shrug'|'torso-swing'|'neck'|'behind-neck'|'control'|'back-arch'|'crunch-range'|'upper-arm'|'bike-seat'|'treadmill-start'|'treadmill-exit';
export type FormCue={kind:CueKind;label:string;avoid:string;aim:string;tip:string};
export const formCues:Record<string,FormCue[]>={
 'bike':[
 {kind:'bike-seat',label:'Seat height',avoid:'A low, cramped seat',aim:'Room for your leg to extend',tip:'Adjust while off the bike. At the furthest pedal position, keep a small knee bend without reaching or rocking your hips.'},
 {kind:'knee-lock',label:'Knees',avoid:'Reaching with a locked knee',aim:'A little bend at the bottom',tip:'A seat that is too high can make you reach for the pedal. Reduce the height if your hips rock or your knee locks.'}],
 'leg-press':[
 {kind:'knee-lock',label:'Knees',avoid:'Forcefully locking the knee',aim:'Stop short of locking out',tip:'Finish the press with a little knee bend. Move smoothly rather than snapping into the end position.'},
 {kind:'hip-lift',label:'Hip contact',avoid:'Hips lifting off the pad',aim:'Hips and back stay supported',tip:'Shorten the lowering range if your pelvis starts to lift or roll away from the pad.'},
 {kind:'depth',label:'Lowering depth',avoid:'Lowering until you curl off the pad',aim:'Stop within your supported range',tip:'Lower only as far as feels comfortable while your heels and pelvis stay planted. The sketch is not a target knee angle.'}],
 'chest-press':[
 {kind:'wrist',label:'Wrists',avoid:'Wrist folded back',aim:'Hand in line with forearm',tip:'Keep the handle supported by a straight, comfortable wrist. Use a lighter load if you cannot hold that position.'},
 {kind:'shrug',label:'Shoulders',avoid:'Shoulders up by your ears',aim:'Shoulders comfortably settled',tip:'Keep your neck relaxed as you press. Adjust the seat so the handles start around mid-chest.'}],
 'seated-row':[
 {kind:'torso-swing',label:'Torso',avoid:'Leaning back to pull the load',aim:'Steady torso as your arms pull',tip:'Choose a load you can move without rocking backward. For a chest-supported model, keep contact with its pad.'},
 {kind:'neck',label:'Neck',avoid:'Chin jutting toward the handle',aim:'Head follows your torso',tip:'Look ahead and keep your neck relaxed. Avoid reaching with your head to finish a repetition.'}],
 'lat-pulldown':[
 {kind:'behind-neck',label:'Bar path',avoid:'Bar behind your neck',aim:'Bar in front, toward upper chest',tip:'Pull down in front of your face. Keep your neck neutral and use a comfortable grip.'},
 {kind:'torso-swing',label:'Torso',avoid:'Swinging backward to pull',aim:'A small, steady lean',tip:'Set your posture first, then keep it steady. Reduce the load if you need a large backward swing.'}],
 'leg-curl':[
 {kind:'hip-lift',label:'Hip contact',avoid:'Pelvis rising off the seat',aim:'Pelvis supported by the seat',tip:'This example shows a seated leg curl. On a lying model, keep your hips against the bench instead.'},
 {kind:'control',label:'Control',avoid:'Swinging the roller',aim:'A smooth curl and return',tip:'Move the roller without a sudden kick. Set the roller and thigh restraint using the instructions for your exact model.'}],
 'leg-extension':[
 {kind:'hip-lift',label:'Hip contact',avoid:'Lifting your hips to move the load',aim:'Hips stay on the seat',tip:'Hold the side handles gently for support. Lower the weight if you have to lift your hips to move it.'},
 {kind:'knee-lock',label:'Knees',avoid:'Snapping into a locked knee',aim:'Straighten without snapping',tip:'Extend smoothly through a comfortable range and control the lowering movement. Stop if your knee hurts.'}],
 'shoulder-press':[
 {kind:'back-arch',label:'Lower back',avoid:'Exaggerated arch off the pad',aim:'Comfortable back support',tip:'Keep your ribs from flaring upward. Do not force your lower back flat; keep a comfortable natural curve.'},
 {kind:'shrug',label:'Shoulders',avoid:'A forced shrug near the bottom',aim:'Relax your neck at the start',tip:'This compares the starting position. Your shoulder blades naturally move as you press overhead; do not pin them down.'}],
 'abdominal-crunch':[
 {kind:'neck',label:'Neck',avoid:'Throwing your head forward',aim:'Head moves with your torso',tip:'Keep your neck relaxed as your ribs curl toward your pelvis. Avoid using a head jerk to start the movement.'},
 {kind:'crunch-range',label:'Range',avoid:'Folding far forward to chase depth',aim:'A small, controlled curl',tip:'Use your abdominals and a comfortable range. Seat, pad and handle positions differ between models.'}],
 'cable-triceps':[
 {kind:'upper-arm',label:'Upper arms',avoid:'Driving the whole arm forward',aim:'Upper arms stay by your sides',tip:'Move mainly at your elbows. If the shoulders have to swing, try a lighter load.'},
 {kind:'torso-swing',label:'Body position',avoid:'Leaning onto the handle',aim:'Balanced, steady posture',tip:'Do not use your body weight to force the cable down. A small comfortable lean is fine if it stays steady.'}],
 'cable-curl':[
 {kind:'torso-swing',label:'Body position',avoid:'Leaning backward to lift',aim:'A steady torso',tip:'Choose a weight you can curl without a backward swing. Keep your knees soft.'},
 {kind:'wrist',label:'Wrists',avoid:'Bending the wrist with the handle',aim:'Hand stays in line with forearm',tip:'Lift by bending the elbow. Let your wrist stay comfortable and steady.'}],
 'treadmill':[
 {kind:'treadmill-start',label:'Starting pace',avoid:'Starting the belt fast',aim:'Start at an easy pace',tip:'Find the stop control and attach the safety clip if provided. Start slowly and build time before speed or incline.'},
 {kind:'treadmill-exit',label:'Getting off',avoid:'Stepping off a moving belt',aim:'Stop the belt before getting off',tip:'Slow down, stop the belt completely, and then step off carefully. Keep the stop control within reach.'}],
};
