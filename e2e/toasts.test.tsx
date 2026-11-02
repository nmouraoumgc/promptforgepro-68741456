import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
const s = vi.hoisted(()=>({next:0,message:vi.fn(),success:vi.fn(),info:vi.fn(),warning:vi.fn(),error:vi.fn(),dismiss:vi.fn()}));
vi.mock('sonner',()=>({toast:{...s,message:(...a:unknown[])=>{s.message(...a);return ++s.next},success:(...a:unknown[])=>{s.success(...a);return ++s.next},info:(...a:unknown[])=>{s.info(...a);return ++s.next},warning:(...a:unknown[])=>{s.warning(...a);return ++s.next},error:(...a:unknown[])=>{s.error(...a);return ++s.next},dismiss:s.dismiss}}));
import { toast, useToast } from '@/hooks/use-toast';
import { toast as sonner } from '@/lib/sonner-toast';
let state:ReturnType<typeof useToast>;
function Probe(){state=useToast();return null;}
let r:ReactTestRenderer;
beforeEach(()=>{vi.useFakeTimers();vi.clearAllMocks();act(()=>{r=create(<Probe/>)});});
afterEach(()=>{act(()=>{state.dismiss();vi.runAllTimers();r.unmount()});sonner.dismiss();vi.clearAllTimers();vi.useRealTimers();});
function tick(n:number){act(()=>vi.advanceTimersByTime(n));}
describe('global toast deadlines',()=>{
 it('login success/info closes at 4 seconds, even if a caller requests Infinity',()=>{
  act(()=>{toast({title:'Bem-vindo de volta',duration:Infinity})});tick(3999);expect(state.toasts[0].open).toBe(true);tick(1);expect(state.toasts[0].open).toBe(false);tick(1000);expect(state.toasts).toEqual([]);
 });
 it('wrong-password and general errors close at 6 seconds',()=>{
  for(const title of ['Email ou palavra-passe incorretos','Erro de teste']){
   act(()=>{toast({title,variant:'destructive',duration:Infinity})});tick(5999);expect(state.toasts[0].open).toBe(true);tick(1);expect(state.toasts[0].open).toBe(false);tick(1000);
  }
 });
 it('manual close cancels the deadline without closing a newer toast',()=>{
  let first:ReturnType<typeof toast>;act(()=>{first=toast({title:'Info'})});tick(1000);act(()=>first.dismiss());expect(state.toasts[0].open).toBe(false);
  act(()=>{toast({title:'Novo erro',variant:'destructive'})});tick(3000);expect(state.toasts[0].open).toBe(true);tick(3000);expect(state.toasts[0].open).toBe(false);
 });
 it('updates use the current error deadline and replaced toasts cannot dismiss their successor',()=>{
  let item:ReturnType<typeof toast>;act(()=>{item=toast({title:'Info'})});tick(3000);act(()=>item.update({title:'Erro',variant:'destructive',duration:Infinity}));tick(5999);expect(state.toasts[0].open).toBe(true);tick(1);expect(state.toasts[0].open).toBe(false);
  act(()=>{toast({title:'Antigo'})});tick(1000);act(()=>{toast({title:'Novo',variant:'destructive'})});tick(3000);expect(state.toasts[0].open).toBe(true);tick(3000);expect(state.toasts[0].open).toBe(false);
 });
 it('Sonner applies 4/6-second deadlines globally, keeps X, and rejects infinite overrides',()=>{
  for(const kind of ['message','success','info','warning','error'] as const){
   const duration=kind==='error'?6000:4000;
   const id=sonner[kind]('QA',{duration:Infinity,closeButton:false});const options=s[kind].mock.calls.at(-1)?.[1];
   expect(options.duration).toBe(duration);expect(options.closeButton).toBe(true);
   tick(duration-1);expect(s.dismiss).not.toHaveBeenCalledWith(id);tick(1);expect(s.dismiss).toHaveBeenCalledWith(id);
  }
 });
 it('Sonner X/manual dismiss cancels its fallback timer',()=>{
  const id=sonner.error('QA');const options=s.error.mock.calls.at(-1)?.[1];options.onDismiss({id});tick(6000);expect(s.dismiss).not.toHaveBeenCalledWith(id);
 });
 it('application calls cannot bypass the central Sonner adapter or request infinite durations',()=>{
  const files:string[]=[];function walk(dir:string){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.tsx?$/.test(e.name))files.push(p)}}walk('src');
  for(const f of files){const source=fs.readFileSync(f,'utf8');
   if(!['src/lib/sonner-toast.ts','src/components/ui/sonner.tsx'].includes(f))expect(source,`${f}: direct Sonner import`).not.toMatch(/from\s*['"]sonner['"]/);
   expect(source,`${f}: infinite toast duration`).not.toMatch(/duration\s*[:=]\s*\{?\s*(?:Infinity|Number\.POSITIVE_INFINITY)/);
  }
 });
});
