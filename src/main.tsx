import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { registerServiceWorker } from "./registerServiceWorker";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
