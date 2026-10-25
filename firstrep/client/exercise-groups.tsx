import {ArrowRight,CheckCircle2,MapPin} from 'lucide-react';
import {families} from './exercise-families';
import {machines,type Machine} from './equipment';
import type {Learning} from './workout-model';
export default function ExerciseGroups({visible,learning,onOpen}:{visible:Machine[];learning:Learning;onOpen:(m:Machine)=>void}){
 const learned=families.filter(f=>f.ids.some(id=>learning[id]?.status==='learned')).length;
 return <><div className="group-summary"><CheckCircle2 size={18}/><span><strong>{learned} of {families.length} groups</strong> have at least one learned option. Each exercise keeps its own progress.</span></div><div className="exercise-groups">{families.map(f=>{const items=visible.filter(m=>f.ids.includes(m.id));return items.length?<section className="panel family-card" key={f.id}><span className="eyebrow">{f.relationship}</span><h2>{f.name}</h2><p>{f.note}</p><div className="family-options">{items.map(m=><button key={m.id} onClick={()=>onOpen(m)}><span><strong>{m.name}</strong><small>{learning[m.id]?.status==='learned'?'Learned':learning[m.id]?.status==='help'?'Need help':'To practise'} · {learning[m.id]?.availability==='available'?'Found at gym':learning[m.id]?.availability==='missing'?'Not at gym':'Setup not checked'}</small></span>{learning[m.id]?.status==='learned'?<CheckCircle2 size={17}/>:<ArrowRight size={17}/>}</button>)}</div></section>:null})}</div></>;
}
