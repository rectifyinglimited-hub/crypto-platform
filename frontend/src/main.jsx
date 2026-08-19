import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={
        <div className="grid min-h-screen place-items-center bg-black p-8 text-center text-white">
          <div>
            <p className="text-xl font-bold">equiti</p>
            <p className="mt-2 text-sm text-white/70">Page failed to load. Refresh once.</p>
          </div>
        </div>
      }
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
