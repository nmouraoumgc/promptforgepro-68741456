import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { registerServiceWorker } from "./registerServiceWorker";
import { trackCampaignLanding } from "./lib/campaignLanding";
import { captureCampaignCodeFromUrl } from "./lib/campaignCode";
import { initAnalytics } from "./lib/analytics";

initAnalytics();
captureCampaignCodeFromUrl();
trackCampaignLanding();

registerServiceWorker();

const rootEl = document.getElementById("root")!;

/** Public pages are prerendered to static HTML (PT, logged out) at build time. Hydrate that markup when the
 *  first client render will match it; otherwise (English UI, or a member landing on "/") render fresh. */
function canHydrate(): boolean {
  if (!rootEl.hasChildNodes() || rootEl.dataset.prerendered !== "1") return false;
  try {
    if ((localStorage.getItem("pf_lang") || "").startsWith("en")) return false;
    if (new URL(window.location.href).searchParams.get("lang")?.startsWith("en")) return false;
    if (window.location.pathname === "/") {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || "";
        if (k.startsWith("sb-") && k.endsWith("-auth-token")) return false;
      }
    }
  } catch { /* ignore */ }
  return true;
}

if (canHydrate()) {
  hydrateRoot(rootEl, <App />);
} else {
  rootEl.textContent = "";
  createRoot(rootEl).render(<App />);
}
