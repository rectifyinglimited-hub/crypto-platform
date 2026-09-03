import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { getToken, clearToken } from "./lib/token.js";
import { isStaffRole, isSuperAdminRole } from "./lib/roles.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import SplashScreen from "./components/SplashScreen.jsx";

const PublicLanding = lazy(() => import("./components/PublicLanding.jsx"));
const AuthGate = lazy(() => import("./components/AuthGate.jsx"));
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

function BootShell({ label = "Opening exchange…" }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
      <div className="text-3xl font-extrabold tracking-tight">equiti</div>
      <p className="mt-3 text-sm text-[#00C2B3]">{label}</p>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState(SCREEN.LANDING);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const splashTimer = useRef(null);

  useEffect(() => {
    window.__equitiReady?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const { AuthAPI, clearToken: wipe } = await import("./lib/api.js");
        const res = await AuthAPI.me();
        if (cancelled) return;
        if (res?.user) {
          if (!isAuthorizedSuperAdmin(res.user)) {
            wipe();
            return;
          }
          setUser(res.user);
          setScreen(isStaffRole(res.user.role) ? SCREEN.ADMIN : SCREEN.DASHBOARD);
        } else {
          wipe();
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
    void import("./components/Dashboard.jsx");
  };

  const handleAuthSuccess = (u) => {
    if (!isAuthorizedSuperAdmin(u)) {
      clearToken();
      setUser(null);
      setScreen(SCREEN.LANDING);
      return;
    }
    void import("./components/Dashboard.jsx");
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
      const { AuthAPI } = await import("./lib/api.js");
      const res = await AuthAPI.me();
      const u = res?.user;
      if (u) setUser(u);
      if (isStaffRole(u?.role)) setScreen(SCREEN.ADMIN);
    } catch {
      if (isStaffRole(user?.role)) setScreen(SCREEN.ADMIN);
    }
  };

  return (
    <Suspense fallback={<BootShell />}>
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
        <ErrorBoundary>
          <Dashboard user={user} onLogout={handleLogout} onOpenAdmin={goAdmin} />
        </ErrorBoundary>
      )}
      {screen === SCREEN.ADMIN && (
        <ErrorBoundary>
          <AdminPanel user={user} onExit={handleLogout} />
        </ErrorBoundary>
      )}
    </Suspense>
  );
}
