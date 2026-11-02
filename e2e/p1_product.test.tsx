// Offline UI regression tests. Only QA identity and fictional fixtures, no network/Paddle/email.
import React from 'react';
import fs from 'node:fs/promises';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { create, act, type ReactTestRenderer } from 'react-test-renderer';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const f=vi.hoisted(()=>({
  auth: { user:null as null|{id:string;email:string}, profile:null as null|{current_plan:string},isAdmin:false,isLoading:false },
  active:{id:'11111111-1111-4111-8111-111111111111',name:'QA Realty',offering:'Consultoria imobiliária e imóveis',tone:'Profissional',audience:'Compradores',keywords:['imóveis'],forbidden_words:['barato'],language:'pt' as const,is_active:true},
  writes:vi.fn(), db:vi.fn(),
  prompt:{id:'qa-prompt',title:'Newsletter de novembro',content:'Escreve uma newsletter mensal.',category:'email',tags:[],versions:[],isFavorite:false},
}));
vi.mock('@/stores/authStore',()=>({useAuthStore:Object.assign((selector?: (s:typeof f.auth)=>unknown)=>selector?selector(f.auth):f.auth,{getState:()=>f.auth,subscribe:()=>()=>{}})}));
vi.mock('@/stores/promptStore',()=>({usePromptStore:Object.assign(()=>({prompts:[f.prompt],toggleFavorite:f.writes,deletePrompt:f.writes,duplicatePrompt:f.writes}),{getState:()=>({resetBuilderState:f.writes,updateBuilderState:f.writes})})}));
vi.mock('@/stores/planStore',()=>({usePlanStore:()=>({currentPlan:f.auth.profile?.current_plan??'free',canAccess:()=>false})}));
vi.mock('@/data/brandDb',()=>({useBrandProfiles:()=>({active:f.active,profiles:[f.active],isLoading:false}),useBrandMutations:()=>{throw new Error('Global brand mutation forbidden');}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(...args:unknown[])=>{f.db(...args);throw new Error('Unexpected DB request');},rpc:f.db}}));
vi.mock('@/hooks/use-toast',()=>({toast:()=>{},useToast:()=>({toast:()=>{}})}));
vi.mock('@/i18n/lang',()=>({useIsEnglish:()=>false,localizeApiError:(s:string)=>s}));
vi.mock('react-i18next',()=>({useTranslation:()=>({t:(key:string)=>({'library.searchPlaceholder':'Pesquisar prompts','library.empty':'Biblioteca vazia','nav.searchPrompts':'Pesquisar prompts'}[key]??key),i18n:{resolvedLanguage:'pt',language:'pt'}})}));
vi.mock('@/hooks/use-mobile',()=>({useIsMobile:()=>false}));
vi.mock('@/components/layout/LanguageSwitcher',()=>({LanguageSwitcher:()=>null}));
vi.mock('@/components/layout/FontSizeControl',()=>({FontSizeControl:()=>null}));
vi.mock('@/lib/pageMeta',()=>({usePageMeta:()=>{}}));
vi.mock('@/lib/analytics',()=>({track:()=>{}}));
vi.mock('@/data/onboarding',()=>({markOnboardingStep:()=>{}}));
vi.mock('@/components/ui/dropdown-menu',()=>({DropdownMenu:({children}:React.PropsWithChildren)=><>{children}</>,DropdownMenuTrigger:({children}:React.PropsWithChildren)=><>{children}</>,DropdownMenuContent:()=>null,DropdownMenuItem:()=>null,DropdownMenuLabel:()=>null,DropdownMenuSeparator:()=>null}));
vi.mock('@/components/ui/select',()=>({Select:({children,onValueChange,value}:React.PropsWithChildren<{onValueChange:(v:string)=>void;value:string}>)=><select value={value} onChange={e=>onValueChange(e.target.value)}>{children}</select>,SelectContent:({children}:React.PropsWithChildren)=><>{children}</>,SelectTrigger:()=>null,SelectValue:()=>null,SelectItem:({children,value}:React.PropsWithChildren<{value:string}>)=><option value={value}>{children}</option>}));
import { TaskBrandProvider, TaskBrandSelector } from '@/components/brand/TaskBrandSelector';
import { useTaskBrand } from '@/components/brand/taskBrandContext';
import { brandConflict } from '@/lib/taskBrand';
import { Header } from '@/components/layout/Header';
import PromptLibrary from '@/pages/PromptLibrary';
import Pricing from '@/pages/Pricing';
import Learn from '@/pages/Learn';
import LessonDetail from '@/pages/LessonDetail';
import { Routes, Route } from 'react-router-dom';
const renderers:ReactTestRenderer[]=[];
const clients:QueryClient[]=[];
let location='';
function Location(){location=useLocation().pathname+useLocation().search;return null;}
async function render(element:React.ReactNode, path='/', cache?: (client:QueryClient)=>void){
  const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});clients.push(client);cache?.(client);
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]} future={{v7_startTransition:true,v7_relativeSplatPath:true}}>{element}<Location/></MemoryRouter></QueryClientProvider>);});
  renderers.push(renderer);return renderer;
}
const text=(r:ReactTestRenderer)=>JSON.stringify(r.toJSON());
beforeEach(()=>{f.auth.user=null;f.auth.profile=null;f.writes.mockClear();f.db.mockClear();});
afterEach(()=>{for(const r of renderers.splice(0))act(()=>r.unmount());for(const c of clients.splice(0))c.clear();expect(f.db).not.toHaveBeenCalled();expect(f.writes).not.toHaveBeenCalled();});
const signIn=()=>{f.auth.user={id:'qa-id',email:'nmourao+pfpqa1031@mail.grokbot.com'};f.auth.profile={current_plan:'free'};};
describe('Task context and visitor journeys',()=>{
 it('shares the per-task choice across consumers, previews context and never updates the global brand',async()=>{
  signIn();let task!:ReturnType<typeof useTaskBrand>;
  function Probe(){task=useTaskBrand();return <output>{JSON.stringify(task.requestBrand)}</output>;}
  const r=await render(<TaskBrandProvider><TaskBrandSelector request="Uma publicação para uma livraria"/><Probe/></TaskBrandProvider>);
  expect(text(r)).toContain('Possível conflito');expect(task.requestBrand.brandId).toBe(f.active.id);
  await act(async()=>r.root.findByType('select').props.onChange({target:{value:'__none__'}}));
  expect(task.requestBrand).toEqual({brandId:null,useBrand:false});expect(f.active.is_active).toBe(true);
  expect(text(r)).not.toContain('Possível conflito');expect(text(r)).toContain('Não será incluído contexto');
 });
 it('conflict hint detects incompatible sector/language, not a matching task',()=>{
  expect(brandConflict(f.active,'Escreve em inglês')).toBe(true);
  expect(brandConflict(f.active,'Anúncio para um imóvel')).toBe(false);
  expect(brandConflict(null,'Uma livraria')).toBe(false);
 });
 it('Enter in header takes QA to encoded library results; visitor has no inert search',async()=>{
  const guest=await render(<Header/>);expect(guest.root.findAllByType('input')).toHaveLength(0);
  signIn();const r=await render(<Header/>);
  await act(async()=>r.root.findByType('input').props.onChange({target:{value:'newsletter & imóvel'}}));
  await act(async()=>r.root.findByProps({role:'search'}).props.onSubmit({preventDefault(){}}));
  expect(location).toBe('/library?q=newsletter%20%26%20im%C3%B3vel');
 });
 it('library reads URL term, renders matches and a real empty-result state',async()=>{
  signIn();const match=await render(<PromptLibrary/>,'/library?q=newsletter');expect(text(match)).toContain('Newsletter de novembro');
  const none=await render(<PromptLibrary/>,'/library?q=inexistente');expect(text(none)).toContain('0 resultados');expect(text(none)).toContain('Nenhum prompt corresponde');
  await act(async()=>none.root.findAllByType('button').find(b=>b.children.includes('Limpar pesquisa'))!.props.onClick());
  expect(location).toBe('/library');expect(text(none)).toContain('Newsletter de novembro');
 });
 it('visitor can start Free from pricing; signed-in QA Free has current plan',async()=>{
  const visitor=await render(<Pricing/>,'/pricing');
  const free=visitor.root.findByProps({'data-testid':'free-card'}).findByType('button');expect(free.props.disabled).toBe(false);expect(text(visitor)).toContain('Começar grátis');
  await act(async()=>free.props.onClick());expect(location).toBe('/signup');
  signIn();const qa=await render(<Pricing/>,'/pricing');expect(qa.root.findByProps({'data-testid':'free-card'}).findByType('button').props.disabled).toBe(true);
 });
 const lesson={id:'lesson-qa',slug:'anatomia-prompt',track:'fundamentos',sector:null,sort_order:1,is_free:true,duration_min:5,level:'basico',title_pt:'Lição QA pública',title_en:'QA lesson',summary_pt:'Resumo QA',summary_en:'QA summary',is_active:true};
 const body={problem:'Problema QA',steps:[],before:{prompt:'A',note:'A'},after:{prompt:'B',note:'B'},try:{intro:'Experimenta',target:'builder',template:'QA template',labels:{}},checklist:[],tips:[]};
 const seed=(c:QueryClient)=>{c.setQueryData(['learn-lessons'],[lesson]);c.setQueryData(['learn-lesson','anatomia-prompt','anon','free',false],{row:lesson,content:{body_pt:body,body_en:body}});};
 it('anonymous catalog and free lesson render; progress and experiment ask for login without writes',async()=>{
  const catalog=await render(<Learn/>,'/learn',seed);expect(text(catalog)).toContain('Lição QA pública');expect(catalog.root.findAllByProps({'data-testid':'learn-progress'})).toHaveLength(0);
  const r=await render(<Routes><Route path="/learn/:slug" element={<LessonDetail/>}/><Route path="/login" element={<p>Entrar</p>}/></Routes>,'/learn/anatomia-prompt',seed);
  expect(text(r)).toContain('Problema QA');
  await act(async()=>r.root.findByProps({'data-testid':'open-builder'}).props.onClick());expect(location).toBe('/login?redirect=%2Flearn%2Fanatomia-prompt');
  const progress=await render(<Routes><Route path="/learn/:slug" element={<LessonDetail/>}/><Route path="/login" element={<p>Entrar</p>}/></Routes>,'/learn/anatomia-prompt',seed);
  await act(async()=>progress.root.findByProps({'data-testid':'lesson-complete'}).props.onClick());expect(location).toBe('/login?redirect=%2Flearn%2Fanatomia-prompt');
 });
});

// The actual owner-scoped server resolver, with only the database client substituted.
it('server brand resolver accepts only own IDs, respects No brand and never falls back for an invalid selection',async()=>{
  const source=await fs.readFile('supabase/functions/_shared/brand.ts','utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
    .replace(/^import .*;$/gm,'').replace(/^export /gm,'');
  const filters:Record<string,string>={};let reads=0;
  const client={from:()=>({select:()=>({eq:(key:string,value:string)=>{
    filters[key]=value;
    const builder={eq:(k:string,v:string)=>{filters[k]=v;return builder;},maybeSingle:async()=>{reads++;return {data:filters.user_id==='qa-id' && (filters.id===f.active.id || filters.is_active==='true') ? f.active : null,error:null};}};
    return builder;
  }})})};
  const resolver=new Function('createClient','Deno',js+';return {resolveTaskBrand,BrandSelectionError};')(()=>client,{env:{get:()=> 'LOCAL_FAKE'}});
  expect(await resolver.resolveTaskBrand('qa-id',{brandId:null})).toBeNull();expect(reads).toBe(0);
  expect((await resolver.resolveTaskBrand('qa-id',{brandId:f.active.id})).id).toBe(f.active.id);expect(filters.user_id).toBe('qa-id');
  await expect(resolver.resolveTaskBrand('qa-id',{brandId:'22222222-2222-4222-8222-222222222222'})).rejects.toThrow('Marca indisponível');
  await expect(resolver.resolveTaskBrand('qa-id',{brandId:'bad-id'})).rejects.toThrow('Marca inválida');
  const before=reads;expect(await resolver.resolveTaskBrand('qa-id',{brandId:f.active.id,useBrand:false})).toBeNull();expect(reads).toBe(before);
});
