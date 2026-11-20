import { createClient } from 'npm:@supabase/supabase-js@2';
const allowed = new Set(['https://promptforgepro.me','https://www.promptforgepro.me']);
const headers = (origin:string) => ({'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type','Vary':'Origin','Cache-Control':'no-store'});
const respond=(status:number,body:object,origin:string)=>new Response(JSON.stringify(body),{status,headers:headers(origin)});
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')||'';
 if(!allowed.has(origin)) return new Response(null,{status:403});
 if(req.method==='OPTIONS') return new Response(null,{status:204,headers:headers(origin)});
 if(req.method!=='POST') return respond(405,{error:'METHOD_NOT_ALLOWED'},origin);
 const len=Number(req.headers.get('content-length')||0);
 if(len>2048) return respond(413,{error:'TOO_LARGE'},origin);
 let payload:Record<string,unknown>;
 try { payload=await req.json(); } catch { return respond(400,{error:'INVALID_JSON'},origin); }
 const email=typeof payload.email==='string'?payload.email.trim().toLowerCase():'';
 const language=payload.language==='en'?'en':'pt';
 if(email.length<5||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||payload.consent!==true) return respond(400,{error:'INVALID_INPUT'},origin);
 // IP is read from edge infrastructure, never from user-submitted JSON.
 const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
 if(!ip) return respond(503,{error:'RATE_LIMIT_UNAVAILABLE'},origin);
 const secret=Deno.env.get('WAITLIST_RATE_LIMIT_SECRET');
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!secret||!url||!key) return respond(503,{error:'NOT_CONFIGURED'},origin);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret+':'+ip));
 const fingerprint=Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc('submit_payment_waitlist',{p_email:email,p_language:language,p_fingerprint:fingerprint});
 if(error){console.error('waitlist insertion failed',error.code);return respond(503,{error:'UNAVAILABLE'},origin);}
 if(data===false) return respond(429,{error:'RATE_LIMITED'},origin);
 return respond(200,{ok:true},origin);
});
