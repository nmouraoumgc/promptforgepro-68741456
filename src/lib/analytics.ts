// Product analytics (PostHog, EU cloud). The project key below is a public client key.
// Anonymous visitors get no person profile (identified_only); signed-in users are identified by their
// Supabase user id only (no email or other PII). Session recordings mask all inputs and skip /admin.
// posthog-js is loaded lazily after first paint so it does not weigh on the initial bundle; calls made
// before it loads are queued and replayed in order.
import type { PostHog } from 'posthog-js';

const POSTHOG_KEY = 'phc_rqUhHyGb9YJY6wb4U3FPsUuWQd3jf22RDfuVrdxH6Psp';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

let started = false;
let ph: PostHog | null = null;
let identifiedId: string | null = null;
const queue: Array<(p: PostHog) => void> = [];

const onAdminPath = () => typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

function withPostHog(fn: (p: PostHog) => void) {
  if (ph) { try { fn(ph); } catch { /* ignore */ } return; }
  queue.push(fn);
  initAnalytics();
}

export function initAnalytics() {
  if (started || typeof window === 'undefined') return;
  return; // QA visual-only: disable all analytics transmission.
  started = true;
  const load = () => import('posthog-js').then(({ default: posthog }) => {
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        ui_host: 'https://eu.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: 'history_change',
        capture_pageleave: true,
        autocapture: true,
        respect_dnt: true,
        session_recording: { maskAllInputs: true },
        // Keep the admin area out of session recordings.
        before_send: (event) => {
          if (event && event.event === '$snapshot' && onAdminPath()) return null;
          return event;
        },
      });
      ph = posthog;
      for (const fn of queue.splice(0)) { try { fn(posthog); } catch { /* ignore */ } }
    } catch (e) {
      console.warn('Analytics init failed', e);
    }
  }).catch(() => { /* blocked by an extension or offline: analytics is optional */ });
  // Defer until the browser is idle so analytics never competes with the first paint.
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(load, { timeout: 2500 });
  else setTimeout(load, 1500);
}

export function track(event: string, properties?: Record<string, unknown>) {
  withPostHog((p) => p.capture(event, properties));
}

/** Call when a Supabase session with a user is present. Only the user id is sent. */
export function identifyUser(userId: string) {
  if (!userId || identifiedId === userId) return;
  identifiedId = userId;
  withPostHog((p) => p.identify(userId));
}

export function setUserPlan(plan: string | null | undefined) {
  if (!plan || !identifiedId) return;
  withPostHog((p) => p.setPersonProperties({ plan }));
}

/** Call on sign-out so the next visitor on this device is not linked to the previous user. */
export function resetAnalytics() {
  identifiedId = null;
  withPostHog((p) => p.reset());
}
