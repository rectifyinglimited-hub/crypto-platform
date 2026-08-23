import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const rootEl = document.getElementById("root");

function showCrash(err) {
  const msg = err?.message || String(err);
  rootEl.innerHTML = `
    <div style="min-height:100vh;background:#000;color:#fff;font-family:Montserrat,sans-serif;padding:40px">
      <div style="font-size:28px;font-weight:800">equiti</div>
      <p style="margin-top:12px;color:#00C2B3">Page hit an error. Refresh once.</p>
      <pre style="margin-top:16px;white-space:pre-wrap;color:#aaa;font-size:12px">${msg}</pre>
    </div>`;
}

window.addEventListener("error", (e) => {
  if (!rootEl?.innerText?.includes("equiti")) showCrash(e.error || e.message);
});

(async () => {
  try {
    const [{ default: App }] = await Promise.all([import("./App.jsx")]);
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error(err);
    showCrash(err);
  }
})();
