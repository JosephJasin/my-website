import { CheckCircle2, ChevronRight, MapPin } from 'lucide-react';
import { machines, statusLabels, type Machine } from './equipment';
import { learningPhases } from './learning-plan';

type Progress=Record<string,{status?:string;availability?:string}|undefined>;
export default function LearningPhases({progress,nextIds,activeIds,onOpen}:{progress:Progress;nextIds:string[];activeIds:string[];onOpen:(m:Machine)=>void}){
 return <div className="learning-phases"><p className="phase-intro">Open any phase whenever you’re ready. Your next visit picks 1–2 unlearned guides from setups you’ve marked as found. Guides marked “Need help” stay paused.</p>
 {learningPhases.map((phase,index)=>{
  const guides=phase.guides.map(id=>machines.find(m=>m.id===id)!);
  const learned=guides.filter(m=>progress[m.id]?.status==='learned').length,found=guides.filter(m=>progress[m.id]?.availability==='available').length;
  return <section className="learning-phase panel" key={phase.id} aria-labelledby={phase.id+'-title'}>
   <div className="phase-heading"><div><span className="eyebrow">PHASE {index+1} · AT YOUR PACE</span><h2 id={phase.id+'-title'}>{phase.title}</h2></div><span className="phase-count">{learned}<small> / {guides.length}<br/>learned</small></span></div>
   <p>{phase.description}</p><div className="phase-meter" role="progressbar" aria-label={phase.title+' learned'} aria-valuemin={0} aria-valuemax={guides.length} aria-valuenow={learned}><span style={{width:`${learned/guides.length*100}%`}}/></div>
   <div className="phase-found"><MapPin size={13}/>{found} {found===1?'setup':'setups'} found at your gym</div>
   <div className="phase-guides">{guides.map(m=>{const p=progress[m.id],status=p?.status||'new';return <button key={m.id} onClick={()=>onOpen(m)}>
    <span className={'phase-guide-icon '+(status==='learned'?'learned':'')}>{status==='learned'?<CheckCircle2 size={18}/>:<span/>}</span>
    <span className="phase-guide-name"><strong>{m.name}</strong><small>{activeIds.includes(m.id)?'In your current visit':nextIds.includes(m.id)?'Suggested next':p?.availability==='available'?'Found at your gym':p?.availability==='missing'?'Not available at your gym':'Check this setup at your gym'}</small></span>
    <span className={'status '+status}>{statusLabels[status]}</span><ChevronRight size={15}/>
   </button>})}</div>
  </section>;
 })}</div>;
}
