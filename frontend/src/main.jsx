import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const rootEl = document.getElementById("root");

function showCrash(err) {
  const msg = err?.message || String(err);
  if (!rootEl) return;
  rootEl.innerHTML = `
    <div style="min-height:100vh;background:#000;color:#fff;font-family:Montserrat,sans-serif;padding:40px;text-align:center">
      <div style="font-size:28px;font-weight:800">equiti</div>
      <p style="margin-top:12px;color:#00C2B3">Could not open the exchange. Refresh once.</p>
      <p style="margin-top:16px"><a href="" style="color:#5EEAD4">Tap to refresh</a></p>
      <pre style="margin-top:16px;white-space:pre-wrap;color:#555;font-size:11px;text-align:left">${msg}</pre>
    </div>`;
}

(async () => {
  try {
    const { default: App } = await import("./App.jsx");
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    window.__equitiReady?.();
  } catch (err) {
    console.error(err);
    showCrash(err);
  }
})();
