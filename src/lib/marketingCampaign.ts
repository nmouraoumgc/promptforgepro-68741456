export const CAMPAIGN_DISMISS_KEY = 'pf-visitor-campaign-dismissed-until';
export const CAMPAIGN_COOLDOWN = 7 * 24 * 60 * 60 * 1000;
export function hasReachedCampaignTrigger(elapsed: number, scrollFraction: number): boolean {
  return elapsed >= 30_000 || scrollFraction >= 0.5;
}
export function canShowCampaign(now: number, dismissedUntil: number, noticeVisible: boolean): boolean {
  return now >= dismissedUntil && !noticeVisible;
}
