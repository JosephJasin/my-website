import {familyFor} from './exercise-families';
export const learningPhases = [
  {id:'foundations', title:'Find your foundations', description:'Easy cardio and the main strength machines. Learn the setup and a comfortable movement first.', guides:['bike','treadmill','elliptical','leg-press','chest-press','seated-row','lat-pulldown','leg-curl','leg-extension','shoulder-press','abdominal-crunch']},
  {id:'cables-combos', title:'Explore cables & combo machines', description:'Reuse familiar equipment with a new attachment, direction or setting. Each movement has its own progress.', guides:['cable-triceps','cable-curl','pec-fly','rear-delt-fly','hip-abduction','hip-adduction','face-pull']},
  {id:'free-weights', title:'Build your free-weight skills & explore', description:'Dumbbells, bars, hip hinges and rowing technique. Practise the patterns with a light, manageable load.', guides:['dumbbell-curl','dumbbell-row','dumbbell-bench-press','barbell-bench-press','goblet-squat','dumbbell-lateral-raise','dumbbell-rdl','barbell-curl','kettlebell-deadlift','barbell-rdl','rowing-erg']},
] as const;

type LearningProgress = Record<string, {status?:string; availability?:string} | undefined>;
const order:readonly string[] = learningPhases.flatMap(p => [...p.guides]);
export function suggestGuides<T extends {id:string}>(catalog:readonly T[], progress:LearningProgress, pace:number):T[] {
  const covered=new Set(catalog.filter(m=>progress[m.id]?.status==='learned').map(m=>familyFor(m.id)?.id||m.id));
  const selected=new Set<string>();
  return catalog.filter(m => progress[m.id]?.availability === 'available' && !['learned','help'].includes(progress[m.id]?.status || 'new'))
    .sort((a,b) => {
      const coverage=Number(covered.has(familyFor(a.id)?.id||a.id))-Number(covered.has(familyFor(b.id)?.id||b.id));
      if(coverage)return coverage;
      const ai=order.indexOf(a.id), bi=order.indexOf(b.id);
      return (ai<0?order.length:ai)-(bi<0?order.length:bi);
    }).filter(m=>{const family=familyFor(m.id)?.id||m.id;if(selected.has(family))return false;selected.add(family);return true}).slice(0,Math.max(1,Math.min(2,pace)));
}
