export type Family = {id:string; name:string; ids:string[]; relationship:string; note:string};
export const families:Family[] = [
 {id:'chest-press',name:'Chest pressing',ids:['chest-press','dumbbell-bench-press','barbell-bench-press'],relationship:'Close alternatives',note:'Usually choose one for a chest-press slot. The support, setup and load differ. Learn barbell rack safety with help.'},
 {id:'chest-fly',name:'Chest fly',ids:['pec-fly'],relationship:'Separate movement',note:'Overlaps chest pressing, but does not replace all of its pressing work.'},
 {id:'row',name:'Horizontal pulling',ids:['seated-row','dumbbell-row'],relationship:'Close alternatives',note:'A seated row and a supported dumbbell row can fill the same general pulling slot.'},
 {id:'pulldown',name:'Vertical pulling',ids:['lat-pulldown'],relationship:'Separate movement',note:'Shares back muscles with rows, but pulls from a different direction.'},
 {id:'overhead',name:'Overhead pressing',ids:['shoulder-press'],relationship:'Separate movement',note:'A shoulder press has a different direction from a chest press.'},
 {id:'lateral',name:'Side shoulders',ids:['dumbbell-lateral-raise'],relationship:'Separate movement',note:'A focused side-shoulder exercise, rather than an overhead press.'},
 {id:'rear',name:'Rear shoulders & upper back',ids:['rear-delt-fly','face-pull'],relationship:'Related options',note:'A face pull bends the elbows and includes shoulder rotation. These are not identical movements.'},
 {id:'curl',name:'Biceps curls',ids:['cable-curl','dumbbell-curl','barbell-curl'],relationship:'Close alternatives',note:'Usually choose one curl. Keep each grip, setup and weight record separate.'},
 {id:'triceps',name:'Triceps isolation',ids:['cable-triceps'],relationship:'Separate movement',note:'Presses also use the triceps. A pushdown adds focused work.'},
 {id:'lower-push',name:'Squatting & leg pressing',ids:['leg-press','goblet-squat'],relationship:'Same workout role',note:'Both can fill a general leg-push slot. Balance, support and trunk demands differ.'},
 {id:'knee-extension',name:'Knee extension',ids:['leg-extension'],relationship:'Separate movement',note:'Focused quadriceps work; not a complete replacement for a squat or leg press.'},
 {id:'knee-flexion',name:'Knee flexion',ids:['leg-curl'],relationship:'Separate movement',note:'Bends the knee to train the hamstrings. Keep separate from hip hinges.'},
 {id:'hinge',name:'Hip hinging',ids:['dumbbell-rdl','barbell-rdl','kettlebell-deadlift'],relationship:'Close & related options',note:'The two Romanian deadlifts are close alternatives. A kettlebell deadlift has a different start position and knee bend.'},
 {id:'hip-out',name:'Outer hips',ids:['hip-abduction'],relationship:'Separate movement',note:'Moves the thighs outward. Sharing a machine does not make this an adduction alternative.'},
 {id:'hip-in',name:'Inner thighs',ids:['hip-adduction'],relationship:'Separate movement',note:'Moves the thighs inward, working different muscles from abduction.'},
 {id:'crunch',name:'Abdominal crunching',ids:['abdominal-crunch'],relationship:'Separate movement',note:'Focused abdominal work, with its own setup and learning progress.'},
 {id:'cardio',name:'Cardio',ids:['bike','treadmill','elliptical','rowing-erg'],relationship:'Cardio alternatives',note:'Choose a comfortable cardio option. A rowing ergometer does not replace a strength row.'},
];
export const familyFor=(id:string)=>families.find(f=>f.ids.includes(id));
export const closeAlternatives=(id:string):string[] => {
 const f=familyFor(id);
 if(id==='dumbbell-rdl'||id==='barbell-rdl')return ['dumbbell-rdl','barbell-rdl'].filter(x=>x!==id);
 return f?.relationship==='Close alternatives'?f.ids.filter(x=>x!==id):[];
};
