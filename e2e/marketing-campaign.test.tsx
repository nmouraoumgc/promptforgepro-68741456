import { describe, expect, it } from 'vitest';
import { canShowCampaign, hasReachedCampaignTrigger } from '@/lib/marketingCampaign';

describe('visitor campaign eligibility', () => {
  it('waits until 30 seconds or halfway down the page', () => {
    expect(hasReachedCampaignTrigger(29999, 0.49)).toBe(false);
    expect(hasReachedCampaignTrigger(30000, 0)).toBe(true);
    expect(hasReachedCampaignTrigger(0, 0.5)).toBe(true);
  });
  it('respects the seven-day dismissal and other visible notices', () => {
    const now = 1_800_000_000_000;
    expect(canShowCampaign(now, now + 1000, false)).toBe(false);
    expect(canShowCampaign(now, now - 1, true)).toBe(false);
    expect(canShowCampaign(now, now - 1, false)).toBe(true);
  });
});
