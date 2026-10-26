import {supplements} from './workout-model';

export default function SupportingText(){
 return <section className="panel supporting-text">
  <h2>Original supporting text</h2>
  <p className="field-hint">Preserved source material. First Rep’s starter guidance is separate.</p>
  {supplements.map(s=><details className="source-document" key={s.id}>
   <summary>{s.title}</summary><div className="original-prose">{s.text}</div>
   {s.id==='cardio'&&<div className="firstrep-note"><strong>First Rep note</strong><p>A six-hour gap is not a universal requirement. Your starter plan permits comfortable cardio after lifting or on another day. <a href="https://pubmed.ncbi.nlm.nih.gov/34757594/" target="_blank" rel="noreferrer">Research reference</a></p></div>}
  </details>)}
 </section>;
}
