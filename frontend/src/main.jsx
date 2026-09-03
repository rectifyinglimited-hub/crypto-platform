import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import {
  clearChunkReloadFlag,
  isChunkLoadError,
  reloadOnceForChunkError,
} from "./lib/chunkRecovery.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

const rootEl = document.getElementById("root");

function showCrash(err) {
  const msg = err?.message || String(err);
  if (!rootEl) return;
  rootEl.innerHTML = `
    <div style="min-height:100vh;background:#000;color:#fff;font-family:Montserrat,sans-serif;padding:40px;text-align:center">
      <div style="font-size:28px;font-weight:800">equiti</div>
      <p style="margin-top:12px;color:#00C2B3">Could not open the exchange.</p>
      <p style="margin-top:16px"><a href="" style="color:#5EEAD4">Tap to open again</a></p>
      <pre style="margin-top:16px;white-space:pre-wrap;color:#555;font-size:11px;text-align:left">${msg}</pre>
    </div>`;
}

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  if (reloadOnceForChunkError(event.payload || event)) return;
});

window.addEventListener("unhandledrejection", (event) => {
  if (!isChunkLoadError(event.reason)) return;
  event.preventDefault();
  reloadOnceForChunkError(event.reason);
});

(async () => {
  try {
    const { default: App } = await import("./App.jsx");
    clearChunkReloadFlag();
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    window.__equitiReady?.();
  } catch (err) {
    if (reloadOnceForChunkError(err)) return;
    console.error(err);
    showCrash(err);
  }
})();
