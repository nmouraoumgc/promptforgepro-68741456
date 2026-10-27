export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  // Skip SW in iframes and on preview/local hosts to avoid stale caches.
  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.endsWith(".vercel.app") ||
    host === "localhost" ||
    host === "127.0.0.1";

  if (isInIframe || isPreviewHost) {
    // Clean up any previously registered SW so previews aren't poisoned.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Falha ao registrar service worker:", error);
    });
  });
}
