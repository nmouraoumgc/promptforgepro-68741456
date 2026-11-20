import type { BillingProvider, VerifiedBillingEvent } from './provider-contract';

export type ReconciliationDecision =
  | { action: 'apply' }
  | { action: 'duplicate' }
  | { action: 'stale' }
  | { action: 'invalid' };

export interface StoredEventCursor {
  provider: BillingProvider;
  providerEventId: string;
  occurredAt: string;
}

export function eventDedupeKey(event: Pick<VerifiedBillingEvent, 'provider' | 'providerEventId'>): string {
  if (!event.providerEventId || !/^[a-zA-Z0-9_.:-]{1,200}$/.test(event.providerEventId)) {
    throw new Error('INVALID_PROVIDER_EVENT_ID');
  }
  return `${event.provider}:${event.providerEventId}`;
}

/**
 * Pure, provider-neutral decision helper. Must be called AFTER signature verification.
 * The caller must enforce the same checks atomically in the database transaction:
 * this helper alone cannot prevent concurrent deliveries or replay.
 */
export function reconcileEvent(
  incoming: VerifiedBillingEvent,
  seenEventKeys: ReadonlySet<string>,
  latestForResource?: StoredEventCursor,
): ReconciliationDecision {
  let key: string;
  try { key = eventDedupeKey(incoming); } catch { return { action: 'invalid' }; }
  const occurred = Date.parse(incoming.occurredAt);
  if (!Number.isFinite(occurred)) return { action: 'invalid' };
  if (seenEventKeys.has(key)) return { action: 'duplicate' };
  if (latestForResource?.provider === incoming.provider) {
    const latest = Date.parse(latestForResource.occurredAt);
    if (Number.isFinite(latest) && occurred < latest) return { action: 'stale' };
    // Equal timestamps need a provider-specific sequence or fetch of canonical state.
    // Never use arrival order as proof of event order.
    if (Number.isFinite(latest) && occurred === latest &&
        latestForResource.providerEventId !== incoming.providerEventId) {
      return { action: 'stale' };
    }
  }
  return { action: 'apply' };
}
