import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { registerServiceWorker } from "./registerServiceWorker";
import { trackCampaignLanding } from "./lib/campaignLanding";
import { captureCampaignCodeFromUrl } from "./lib/campaignCode";

captureCampaignCodeFromUrl();
trackCampaignLanding();

registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
