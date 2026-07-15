/**
 * =============================================================================
 *  NEXUS FRONTEND — src/App.jsx
 * =============================================================================
 *  Root shell:
 *    BOOT     → hydrating session
 *    LANDING  → MainPlatform (live futures interface + morphing auth panel)
 *    DASHBOARD → authenticated user hub
 *    ADMIN    → admin console (requires role === 'admin')
 * =============================================================================
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import MainPlatform from "./components/MainPlatform.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import { AuthAPI, getToken, clearToken } from "./lib/api.js";

const SCREEN = {
  BOOT: "boot",
  LANDING: "landing",
  DASHBOARD: "dashboard",
  ADMIN: "admin",
};

export default function App() {
  const [screen, setScreen] = useState(SCREEN.BOOT);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const token = getToken();
      if (!token) {
        if (!cancelled) setScreen(SCREEN.LANDING);
        return;
      }
      try {
        const res = await AuthAPI.me();
        if (cancelled) return;
        if (res?.user) {
          setUser(res.user);
          setScreen(SCREEN.DASHBOARD);
        } else {
          clearToken();
          setScreen(SCREEN.LANDING);
        }
      } catch {
        if (!cancelled) {
          clearToken();
          setScreen(SCREEN.LANDING);
        }
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      setUser(null);
      setScreen(SCREEN.LANDING);
    };
    window.addEventListener("nexus:unauthenticated", handler);
    return () => window.removeEventListener("nexus:unauthenticated", handler);
  }, []);

  const handleAuthSuccess = (u) => {
    setUser(u);
    setScreen(SCREEN.DASHBOARD);
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setScreen(SCREEN.LANDING);
  };

  const goAdmin = async () => {
    try {
      const res = await AuthAPI.me();
      const u = res?.user;
      if (u) setUser(u);
      if (u?.role === "admin") {
        setScreen(SCREEN.ADMIN);
      }
    } catch {
      // Fall back to cached role
      if (user?.role === "admin") setScreen(SCREEN.ADMIN);
    }
  };
  const goDashboard = () => setScreen(SCREEN.DASHBOARD);

  return (
    <AnimatePresence mode="wait">
      {screen === SCREEN.BOOT && (
        <motion.div
          key="boot"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="grid min-h-screen w-full place-items-center bg-slate-950 text-slate-300"
        >
          <div className="flex items-center gap-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Restoring session…
          </div>
        </motion.div>
      )}

      {screen === SCREEN.LANDING && (
        <MainPlatform key="landing" onAuthSuccess={handleAuthSuccess} />
      )}

      {screen === SCREEN.DASHBOARD && (
        <Dashboard
          key="dashboard"
          user={user}
          onLogout={handleLogout}
          onOpenAdmin={goAdmin}
        />
      )}

      {screen === SCREEN.ADMIN && (
        <AdminPanel key="admin" user={user} onExit={goDashboard} />
      )}
    </AnimatePresence>
  );
}
