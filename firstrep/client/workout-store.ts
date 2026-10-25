import {useCallback,useEffect,useRef,useState} from 'react';
import {defaultWorkoutSettings,type WorkoutState} from './workout-model';
export function useWorkouts(enabled:boolean){
 const [data,setData]=useState<WorkoutState>({settings:defaultWorkoutSettings,settingsRevision:0,sessions:[]});
 const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[signin,setSignin]=useState(false);
 const lock=useRef(false),generation=useRef(0);
 const load=useCallback(async()=>{
  if(!enabled||lock.current)return;const gen=++generation.current;
  try{const r=await fetch('/firstrep/api/workouts',{cache:'no-store',redirect:'manual'});if(r.type==='opaqueredirect'||r.status===401){setSignin(true);throw Error('Sign in again to load your workouts.')}if(!r.ok)throw Error('Workouts could not be loaded. Retry when connected.');const d=await r.json() as WorkoutState & {error?:string};if(gen===generation.current){setData(d);setLoaded(true);setError('');setSignin(false);}}
  catch(e){if(gen===generation.current)setError((e as Error).message)}
 },[enabled]);
 useEffect(()=>{load();const timer=setInterval(()=>{if(document.visibilityState==='visible')load()},20000);window.addEventListener('focus',load);window.addEventListener('online',load);return()=>{clearInterval(timer);window.removeEventListener('focus',load);window.removeEventListener('online',load)}},[load]);
 async function mutate(body:object){
  if(lock.current||!loaded)return false;lock.current=true;generation.current++;setBusy(true);setError('');let refresh=false;
  try{const r=await fetch('/firstrep/api/workouts',{method:'POST',headers:{'Content-Type':'application/json'},redirect:'manual',body:JSON.stringify(body)});if(r.type==='opaqueredirect'||r.status===401){setSignin(true);throw Error('Sign in again before saving. Your change has not been saved.')}const d=await r.json() as WorkoutState & {error?:string};if(!r.ok){refresh=r.status===409;throw Error(d.error||'This change was not saved.')}setData(d);setSignin(false);return true;}
  catch(e){setError((e as Error).message);return false;}
  finally{lock.current=false;setBusy(false);if(refresh){const message='Another device may have changed this workout. Review the refreshed values before retrying.';await load();setError(message)}}
 }
 return {data,loaded,busy,error,signin,load,mutate,canWrite:enabled&&loaded&&!busy&&!signin};
}
