import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// One id per build: stamped into sw.js (so each deploy installs a fresh SW that purges old caches)
// and into /version.json (polled by the app to auto-reload onto new deploys).
const BUILD_ID = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + Math.random().toString(36).slice(2, 7);

function buildVersion(): Plugin {
  return {
    name: "pf-build-version",
    apply: "build",
    closeBundle() {
      const out = path.resolve(__dirname, "dist");
      const sw = path.join(out, "sw.js");
      if (fs.existsSync(sw)) fs.writeFileSync(sw, fs.readFileSync(sw, "utf8").replace(/__BUILD_ID__/g, BUILD_ID));
      fs.writeFileSync(path.join(out, "version.json"), JSON.stringify({ buildId: BUILD_ID }));
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [react(), buildVersion()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
