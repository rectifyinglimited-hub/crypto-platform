/**
 * =============================================================================
 *  NEXUS FRONTEND — src/App.jsx
 * =============================================================================
 *  Root shell:
 *    BOOT     → hydrating session
 *    LANDING  → public marketing Landing Page
 *    AUTH     → Sign In / Register gate
 *    SPLASH   → animated Nexus wordmark after successful auth (1.5–2s)
 *    DASHBOARD → authenticated user hub
 *    ADMIN    → admin console (requires role === 'admin')
 * =============================================================================
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import PublicLanding from "./components/PublicLanding.jsx";
import AuthGate from "./components/AuthGate.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import { AuthAPI, getToken, clearToken } from "./lib/api.js";

const SCREEN = {
  BOOT: "boot",
  LANDING: "landing",
  AUTH: "auth",
  SPLASH: "splash",
  DASHBOARD: "dashboard",
  ADMIN: "admin",
};

/** Splash dwell: 1.5–2.0 seconds */
const SPLASH_MS = 1750;

export default function App() {
  const [screen, setScreen] = useState(SCREEN.BOOT);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const splashTimer = useRef(null);

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
      if (splashTimer.current) {
        clearTimeout(splashTimer.current);
        splashTimer.current = null;
      }
      setUser(null);
      setScreen(SCREEN.LANDING);
    };
    window.addEventListener("nexus:unauthenticated", handler);
    return () => window.removeEventListener("nexus:unauthenticated", handler);
  }, []);

  useEffect(
    () => () => {
      if (splashTimer.current) clearTimeout(splashTimer.current);
    },
    []
  );

  const openAuth = (mode = "signin") => {
    setAuthMode(mode);
    setScreen(SCREEN.AUTH);
  };

  const handleAuthSuccess = (u) => {
    setUser(u);
    setScreen(SCREEN.SPLASH);
    if (splashTimer.current) clearTimeout(splashTimer.current);
    splashTimer.current = setTimeout(() => {
      splashTimer.current = null;
      setScreen(SCREEN.DASHBOARD);
    }, SPLASH_MS);
  };

  const handleLogout = () => {
    if (splashTimer.current) {
      clearTimeout(splashTimer.current);
      splashTimer.current = null;
    }
    clearToken();
    try {
      sessionStorage.removeItem("nexus_toasted_trades");
    } catch {
      /* ignore */
    }
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
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <PublicLanding
            onSignIn={() => openAuth("signin")}
            onRegister={() => openAuth("signup")}
          />
        </motion.div>
      )}

      {screen === SCREEN.AUTH && (
        <AuthGate
          key="auth"
          initialMode={authMode}
          onAuthSuccess={handleAuthSuccess}
          onBack={() => setScreen(SCREEN.LANDING)}
        />
      )}

      {screen === SCREEN.SPLASH && (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <SplashScreen />
        </motion.div>
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
