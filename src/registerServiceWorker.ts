declare const __BUILD_ID__: string;

/** Reloads once when a newer deploy is live (new SW took control, or /version.json changed). */
function setupAutoUpdate() {
  const RELOAD_KEY = 'pf_reloaded_for';
  const reloadFor = (id: string) => {
    if (sessionStorage.getItem(RELOAD_KEY) === id) return; // avoid loops
    sessionStorage.setItem(RELOAD_KEY, id);
    window.location.reload();
  };
  const check = async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const { buildId } = await res.json();
      if (buildId && buildId !== __BUILD_ID__) {
        const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
        await Promise.all(regs.map((r) => r.update().catch(() => {})));
        reloadFor(buildId);
      }
    } catch { /* offline */ }
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  window.addEventListener('focus', check);
  setInterval(check, 5 * 60 * 1000);
  setTimeout(check, 3000);
}

export function registerServiceWorker() {
  setupAutoUpdate();
  if (!("serviceWorker" in navigator)) return;

  const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const host = window.location.hostname;
  const isPreviewHost = host.includes("id-preview--") || host.endsWith(".vercel.app") || host === "localhost" || host === "127.0.0.1";

  if (isInIframe || isPreviewHost) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    return;
  }

  // A new SW taking control means a new deploy: reload once onto it.
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) window.location.reload();
    hadController = true;
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((reg) => {
      reg.update().catch(() => {});
      if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
    }).catch((error) => console.error("Service worker registration failed:", error));
  });
}
