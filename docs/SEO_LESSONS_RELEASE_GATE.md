# SEO lessons: safe prerendering — implementation gate

## Confirmed failure of PR #26
Vercel preview build exited at `scripts/postbuild.mjs:47`: no Chrome binary was present. The Vite compilation itself succeeded. The previous proposal also rendered only Portuguese and waited on anonymous Supabase reads without proving that all public content was available.

## Release requirements
1. Generate **both** Portuguese and English HTML for `/learn` and each of the four free lessons. English URLs use `?lang=en`, with matching canonical, hreflang, Open Graph and `<html lang>` values.
2. Read only active `is_free=true` lesson metadata and bodies through the public, RLS-governed Supabase interface. Never embed a service-role key, authenticated session, or any paid lesson body in the build output.
3. Choose a deterministic build-time HTML generation method that works on Vercel **without relying on a system Chrome installation**. Fail the build if a public lesson is missing; do not silently publish an empty shell.
4. Ensure Vercel serves the English static variant for `?lang=en` using query-aware routing, and Portuguese otherwise. Preserve SPA routes for paid lessons.
5. Verify that React can hydrate/navigate from the prerendered HTML without duplication, hydration warnings or stale content. The generated HTML must remain compatible with the current CSP.
6. Run `node scripts/check-learn-seo.mjs` after generating static HTML. Add integration checks for HTTP routing, anonymous access and exclusion of paid lesson bodies.
7. Confirm Vercel preview build READY, and inspect the raw HTTP response for all 8 lesson-language variants. Test responsive UX and authentication boundaries.

## State
This branch currently adds the regression gate only; it does **not** change the production build or claim to solve the prerendering problem. Do not merge until the implementation and preview checks are complete.
