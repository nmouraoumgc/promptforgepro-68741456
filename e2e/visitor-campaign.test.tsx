import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ english: false, track: vi.fn(), notice: false }));
vi.mock('@/i18n/lang', () => ({ useIsEnglish: () => mock.english }));
vi.mock('@/lib/analytics', () => ({ track: mock.track }));
vi.mock('react-router-dom', () => ({ Link: ({children, ...props}: React.PropsWithChildren<Record<string, unknown>>) => <a {...props}>{children}</a> }));
import { VisitorCampaign } from '@/components/marketing/VisitorCampaign';
let renderer: ReactTestRenderer;
let values: Record<string,string>;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-13T00:00:00Z')); mock.track.mockReset(); mock.notice=false; mock.english=false; values={};
  vi.stubGlobal('localStorage',{getItem:(k:string)=>values[k] ?? null,setItem:(k:string,v:string)=>{values[k]=v;}});
  vi.stubGlobal('document',{documentElement:{scrollHeight:2000},querySelector:()=>mock.notice?{}:null});
  vi.stubGlobal('window',{innerHeight:1000,scrollY:0,setInterval,clearInterval,addEventListener:vi.fn(),removeEventListener:vi.fn()});
});
afterEach(() => { if(renderer) act(()=>renderer.unmount()); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('visitor signup message', () => {
  it('waits for an existing notice to close, then records view and close once', () => {
    mock.notice=true; act(()=>{renderer=create(<VisitorCampaign/>)});
    act(()=>vi.advanceTimersByTime(31000)); expect(renderer.root.findAllByType('aside')).toHaveLength(0); expect(mock.track).not.toHaveBeenCalled();
    mock.notice=false; act(()=>vi.advanceTimersByTime(1000)); expect(renderer.root.findAllByType('aside')).toHaveLength(1);
    expect(mock.track).toHaveBeenCalledWith('visitor_campaign_viewed',{campaign:'first_prompt_v1'});
    act(()=>renderer.root.findByType('button').props.onClick()); expect(renderer.root.findAllByType('aside')).toHaveLength(0);
    expect(mock.track).toHaveBeenCalledWith('visitor_campaign_dismissed',{campaign:'first_prompt_v1'});
    expect(Number(values['pf-visitor-campaign-dismissed-until'])-Date.now()).toBe(7*24*60*60*1000);
  });
  it('renders English and records click to the signup route', () => {
    mock.english=true; act(()=>{renderer=create(<VisitorCampaign/>)}); act(()=>vi.advanceTimersByTime(30000));
    const link=renderer.root.findByType('a'); expect(link.props.to).toBe('/signup'); expect(renderer.root.findByType('h2').children.join('')).toContain('structured prompt');
    act(()=>link.props.onClick()); expect(mock.track).toHaveBeenCalledWith('visitor_campaign_clicked',{campaign:'first_prompt_v1'});
  });
});
