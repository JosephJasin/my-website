import { useRef, useState } from 'react';
import { Download, Upload, X } from 'lucide-react';

export default function BackupControls({disabled,restore}:{disabled:boolean;restore:(backup:unknown)=>Promise<boolean>}){
  const [candidate,setCandidate]=useState<unknown>(null),[filename,setFilename]=useState(''),[error,setError]=useState('');
  const input=useRef<HTMLInputElement>(null);
  async function select(file:File|undefined){
    setError('');setCandidate(null);if(!file)return;
    if(file.size>2_000_000){setError('Please choose a First Rep JSON backup smaller than 2 MB.');return;}
    try{
      let data=JSON.parse(await file.text());
      // Also accept the original app's authenticated progress export.
      if(!data.format&&data.machines&&data.preferences&&Array.isArray(data.visits))data={format:'firstrep-backup',version:1,exportedAt:new Date().toISOString(),data};
      if(data.format!=='firstrep-backup'||data.version!==1||!data.data)throw Error();
      setCandidate(data);setFilename(file.name);
    }catch{setError('This file is not a recognised First Rep backup.');}
  }
  return <section className="panel backup-panel"><h2>A copy you can keep</h2><p>Download your progress, notes and visits. Importing a backup adds missing records and keeps anything you have already saved here.</p>
    <div className="backup-actions"><a className={'button secondary small '+(disabled?'disabled-link':'')} aria-disabled={disabled} onClick={e=>{if(disabled)e.preventDefault()}} href="/firstrep/api/export"><Download size={16}/>Export progress</a><button className="button secondary small" disabled={disabled} onClick={()=>input.current?.click()}><Upload size={16}/>Choose backup</button><input ref={input} type="file" accept=".json,application/json" hidden onChange={e=>{select(e.target.files?.[0]);e.target.value='';}}/></div>
    {candidate!==null&&<div className="backup-confirm"><div><strong>{filename}</strong><p>Existing records will be kept. Missing records will be added to your account.</p></div><button className="button primary small" disabled={disabled} onClick={async()=>{if(await restore(candidate))setCandidate(null)}}>Import backup</button><button className="icon-button" aria-label="Cancel import" onClick={()=>setCandidate(null)}><X size={16}/></button></div>}
    {error&&<p className="backup-error" role="alert">{error}</p>}
    <p className="backup-note">Backups contain your personal notes and progress. Keep them somewhere private.</p>
  </section>;
}
