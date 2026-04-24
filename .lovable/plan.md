## Plan: Always-Fresh Promo Code Fetching at Checkout

### Problem

The `promoStore` uses Zustand's `persist` middleware, which caches the entire `promoCodes` array in `localStorage`. When a user opens the checkout, the store hydrates with stale data from a previous session (potentially missing newly created codes, or holding deleted/deactivated ones).

While the current code in `Checkout.tsx` and `Pricing.tsx` does call `await fetchPromoCodes()` before validation, the underlying `fetchPromoCodes` silently swallows errors (e.g. RLS rejection, network failure) and falls back to whatever stale data is still in the store. This means a failed refresh can validate against outdated cached codes without the user knowing.

### Changes

**1. Stop persisting promo codes to localStorage** — `src/stores/promoStore.ts`

Remove the `persist` middleware entirely. Promo codes are server-controlled data that must always be fresh; persisting them adds zero UX benefit (admin lists and checkout both fetch on mount) and creates a stale-cache trap.

**2. Surface fetch failures instead of silently falling back** — `src/stores/promoStore.ts`

Change `fetchPromoCodes` to:
- Throw on error (or return a clear `{ success: false }`).
- Reset `promoCodes` to `[]` when a fetch fails, so validation cannot accidentally match against a previous in-memory snapshot.

**3. Force fresh fetch + handle failure at checkout** — `src/pages/Checkout.tsx` and `src/pages/Pricing.tsx`

In `handleApplyPromo` / `handleApplyProPromo`:
- Wrap the `await fetchPromoCodes()` call in `try/catch`.
- On failure show a clear error: `"Não foi possível verificar o código. Tenta novamente."` (PT) / `"Could not verify the code. Please try again."` (EN).
- Continue using `usePromoStore.getState().promoCodes` (not the React-hook value) immediately after the await so we read the freshly written state, not a stale render snapshot.

**4. Add a one-time cleanup of any existing cached entry** — `src/stores/promoStore.ts`

Add a top-level `try { localStorage.removeItem('promo-codes-storage'); } catch {}` so users who already have stale data in their browser get it cleared on next load.

### Technical Details

- No database or edge function changes required. RLS already correctly exposes `is_active = true AND expires_at > now()` rows to anonymous and authenticated users.
- The admin promo management page (`/admin`) also calls `fetchPromoCodes()` on mount, so removing `persist` does not regress admin UX — it just guarantees freshness.
- TypeScript surface stays the same; only the middleware wrapper is removed.

### Files Modified

- `src/stores/promoStore.ts` — remove `persist`, throw on fetch error, clear legacy localStorage key.
- `src/pages/Checkout.tsx` — try/catch around `fetchPromoCodes()` with user-facing error.
- `src/pages/Pricing.tsx` — try/catch around `fetchPromoCodes()` with user-facing error.
