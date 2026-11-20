import { createClient } from 'npm:@supabase/supabase-js@2';
const allowed=new Set(['https://promptforgepro.me','https://www.promptforgepro.me']);
const headers=(origin:string)=>({'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version','Vary':'Origin','Cache-Control':'no-store'});
const respond=(status:number,body:object,origin:string)=>new Response(JSON.stringify(body),{status,headers:headers(origin)});
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')||'';
 if(!allowed.has(origin)) return new Response(null,{status:403});
 if(req.method==='OPTIONS') return new Response(null,{status:204,headers:headers(origin)});
 if(req.method!=='POST') return respond(405,{error:'METHOD_NOT_ALLOWED'},origin);
 if(Number(req.headers.get('content-length')||0)>2048) return respond(413,{error:'TOO_LARGE'},origin);
 let body:Record<string,unknown>;
 try { body=await req.json(); } catch {return respond(400,{error:'INVALID_JSON'},origin);}
 const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
 const billing=body.billing==='annual'?'annual':body.billing==='monthly'?'monthly':'';
 const language=body.language==='en'?'en':'pt';
 if(body.consent!==true||body.campaign!=='PRODUCTHUNT20'||!billing||email.length<5||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return respond(400,{error:'INVALID_INPUT'},origin);
 const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
 if(!ip)return respond(503,{error:'RATE_LIMIT_UNAVAILABLE'},origin);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return respond(503,{error:'NOT_CONFIGURED'},origin);
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key+':'+ip));
 const fingerprint=Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc('submit_pro_campaign_reservation',{p_email:email,p_billing:billing,p_language:language,p_fingerprint:fingerprint});
 if(error){console.error('reservation failed',error.code);return respond(503,{error:'UNAVAILABLE'},origin);}
 if(data===false)return respond(429,{error:'RATE_LIMITED'},origin);
 return respond(200,{ok:true,pendingReview:true},origin);
});
