import { lazy, Suspense, useEffect, useRef, useState } from "react";
import PublicLanding from "./components/PublicLanding.jsx";
import { AuthAPI, getToken, clearToken } from "./lib/api.js";
import { isStaffRole, isSuperAdminRole } from "./lib/roles.js";

const AuthGate = lazy(() => import("./components/AuthGate.jsx"));
const SplashScreen = lazy(() => import("./components/SplashScreen.jsx"));
const Dashboard = lazy(() => import("./components/Dashboard.jsx"));
const AdminPanel = lazy(() => import("./components/AdminPanel.jsx"));

const SOLE_SUPER = {
  email: "sohaib101malik@gmail.com",
  username: "sohaib101malik",
};

function isAuthorizedSuperAdmin(u) {
  if (!isSuperAdminRole(u?.role)) return true;
  const email = String(u?.email || "")
    .trim()
    .toLowerCase();
  const username = String(u?.username || "")
    .trim()
    .toLowerCase();
  return email === SOLE_SUPER.email || username === SOLE_SUPER.username;
}

const SCREEN = {
  LANDING: "landing",
  AUTH: "auth",
  SPLASH: "splash",
  DASHBOARD: "dashboard",
  ADMIN: "admin",
};

const SPLASH_MS = 1750;

export default function App() {
  const [screen, setScreen] = useState(SCREEN.LANDING);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const splashTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const res = await AuthAPI.me();
        if (cancelled) return;
        if (res?.user) {
          if (!isAuthorizedSuperAdmin(res.user)) {
            clearToken();
            return;
          }
          setUser(res.user);
          setScreen(isStaffRole(res.user.role) ? SCREEN.ADMIN : SCREEN.DASHBOARD);
        } else {
          clearToken();
        }
      } catch {
        clearToken();
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

  const openAuth = (mode = "signin") => {
    setAuthMode(mode);
    setScreen(SCREEN.AUTH);
  };

  const handleAuthSuccess = (u) => {
    if (!isAuthorizedSuperAdmin(u)) {
      clearToken();
      setUser(null);
      setScreen(SCREEN.LANDING);
      return;
    }
    setUser(u);
    setScreen(SCREEN.SPLASH);
    if (splashTimer.current) clearTimeout(splashTimer.current);
    splashTimer.current = setTimeout(() => {
      splashTimer.current = null;
      setScreen(isStaffRole(u?.role) ? SCREEN.ADMIN : SCREEN.DASHBOARD);
    }, SPLASH_MS);
  };

  const handleLogout = () => {
    if (splashTimer.current) {
      clearTimeout(splashTimer.current);
      splashTimer.current = null;
    }
    clearToken();
    setUser(null);
    setScreen(SCREEN.LANDING);
  };

  const goAdmin = async () => {
    try {
      const res = await AuthAPI.me();
      const u = res?.user;
      if (u) setUser(u);
      if (isStaffRole(u?.role)) setScreen(SCREEN.ADMIN);
    } catch {
      if (isStaffRole(user?.role)) setScreen(SCREEN.ADMIN);
    }
  };

  return (
    <Suspense fallback={<div className="bg-black p-8 text-white">Loading…</div>}>
      {screen === SCREEN.LANDING && (
        <PublicLanding
          onSignIn={() => openAuth("signin")}
          onRegister={() => openAuth("signup")}
        />
      )}
      {screen === SCREEN.AUTH && (
        <AuthGate
          initialMode={authMode}
          onAuthSuccess={handleAuthSuccess}
          onBack={() => setScreen(SCREEN.LANDING)}
        />
      )}
      {screen === SCREEN.SPLASH && <SplashScreen />}
      {screen === SCREEN.DASHBOARD && (
        <Dashboard user={user} onLogout={handleLogout} onOpenAdmin={goAdmin} />
      )}
      {screen === SCREEN.ADMIN && <AdminPanel user={user} onExit={handleLogout} />}
    </Suspense>
  );
}
