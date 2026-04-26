export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  // Skip SW in iframes (Lovable editor preview) and on preview hosts to avoid stale caches.
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
    host.includes("lovableproject.com") ||
    host === "localhost" ||
    host === "127.0.0.1";

  if (isInIframe || isPreviewHost) {
    // Clean up any previously registered SW so the editor preview isn't poisoned.
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
