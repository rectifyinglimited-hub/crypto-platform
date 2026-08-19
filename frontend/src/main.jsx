import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const root = document.getElementById("root");
try {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  console.error(err);
  root.innerHTML =
    '<div style="padding:32px;color:#fff;font-family:sans-serif"><h1>equiti</h1><p>Refresh the page.</p></div>';
}
