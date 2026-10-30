// Product analytics (PostHog, EU cloud). The project key below is a public client key.
// Anonymous visitors get no person profile (identified_only); signed-in users are identified by their
// Supabase user id only (no email or other PII). Session recordings mask all inputs and skip /admin.
import posthog from 'posthog-js';

const POSTHOG_KEY = 'phc_rqUhHyGb9YJY6wb4U3FPsUuWQd3jf22RDfuVrdxH6Psp';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

let started = false;
let identifiedId: string | null = null;

const onAdminPath = () => typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

export function initAnalytics() {
  if (started || typeof window === 'undefined') return;
  started = true;
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
  } catch (e) {
    console.warn('Analytics init failed', e);
  }
}

export function track(event: string, properties?: Record<string, unknown>) {
  initAnalytics();
  try { posthog.capture(event, properties); } catch { /* ignore */ }
}

/** Call when a Supabase session with a user is present. Only the user id is sent. */
export function identifyUser(userId: string) {
  initAnalytics();
  if (!userId || identifiedId === userId) return;
  identifiedId = userId;
  try { posthog.identify(userId); } catch { /* ignore */ }
}

export function setUserPlan(plan: string | null | undefined) {
  if (!plan || !identifiedId) return;
  try { posthog.setPersonProperties({ plan }); } catch { /* ignore */ }
}

/** Call on sign-out so the next visitor on this device is not linked to the previous user. */
export function resetAnalytics() {
  initAnalytics();
  identifiedId = null;
  try { posthog.reset(); } catch { /* ignore */ }
}
