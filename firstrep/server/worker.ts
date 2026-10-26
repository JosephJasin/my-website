import { drizzle } from 'drizzle-orm/d1';
import { authenticate, configured, type AccessConfig } from './auth';
import { json, progressService } from './progress';
import * as schema from './schema';
import { workoutService, ensureWorkoutTables } from './workouts';

export interface Env extends AccessConfig { ASSETS:Fetcher; FIRSTREP_DB?:D1Database }
const isFirstRep=(path:string)=>path==='/firstrep'||path.startsWith('/firstrep/');
const securityHeaders={
  'Cache-Control':'private, no-store',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'X-Robots-Tag':'noindex, nofollow',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};
function unavailable(message:string,status:number,isApi:boolean){
  if(isApi)return json({error:message},status);
  return new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>First Rep</title><body style="color:#f3f5eb;background:#121512;font:16px system-ui;max-width:520px;margin:15vh auto;padding:24px"><h1>First Rep</h1><p>${message}</p><p><a style="color:#c3ee74" href="/firstrep/">Try again</a></p><a style="color:#a2aa9b" href="/">Back to Joseph’s website</a></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8',...securityHeaders}});
}
export default {
  async fetch(request:Request,env:Env):Promise<Response>{
    const url=new URL(request.url);
    // Canonicalise before the asset lookup so encoded segments cannot bypass the private prefix.
    try {
      let path=url.pathname;
      for(let i=0;i<4;i++){
        const decoded=decodeURIComponent(path);
        if(decoded===path)break;
        path=decoded;
      }
      path=path.replaceAll('\\','/').replace(/\/{2,}/g,'/');
      const canonical=new URL(url.origin+path).pathname;
      if(canonical!==url.pathname){url.pathname=canonical;return Response.redirect(url.toString(),308);}
    }catch{return new Response('Invalid path.',{status:400});}
    if(!isFirstRep(url.pathname))return env.ASSETS.fetch(request);
    if(url.hostname==='www.josephjasin.com'){
      url.hostname='josephjasin.com';return Response.redirect(url.toString(),308);
    }
    const isApi=url.pathname.startsWith('/firstrep/api/');
    if(!configured(env)||!env.FIRSTREP_DB)return unavailable('Private sign-in is being configured. Your progress is not publicly accessible.',503,isApi);
    const user=await authenticate(request,env);
    if(!user)return unavailable('Please sign in with your approved email address. If your session expired, open First Rep again to sign in.',401,isApi);
    if(url.pathname==='/firstrep')return Response.redirect(`${url.origin}/firstrep/`,308);
    if(isApi){
      const progress=progressService(drizzle(env.FIRSTREP_DB,{schema}),async userId=>{await ensureWorkoutTables(env.FIRSTREP_DB!);return !!await env.FIRSTREP_DB!.prepare("SELECT id FROM workout_sessions WHERE user_id=? AND status='active'").bind(userId).first()});
      if(['/firstrep/api/workouts','/firstrep/api/workouts/export'].includes(url.pathname))return workoutService(env.FIRSTREP_DB,progress.state).handle(request,user.userId);
      if(!['/firstrep/api/progress','/firstrep/api/export'].includes(url.pathname))return json({error:'Not found.'},404);
      return progress.handle(request,user.userId);
    }
    const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);
    for(const [name,value]of Object.entries(securityHeaders))headers.set(name,value);
    return new Response(response.body,{status:response.status,headers});
  },
} satisfies ExportedHandler<Env>;
