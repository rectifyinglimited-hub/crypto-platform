/**
 * Centered Sign-In / Sign-Up entry gate for unauthenticated visitors.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import SignIn from "./SignIn.jsx";
import SignUp from "./SignUp.jsx";

export default function AuthGate({ onAuthSuccess }) {
  const [mode, setMode] = useState("signin");

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#070a12] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.08),_transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500/30 to-emerald-500/20 ring-1 ring-white/10">
            <Sparkles className="h-6 w-6 text-cyan-200" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-400/80">
            Nexus
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Professional Seconds Exchange
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to access your trading wallet and live markets.
          </p>
        </motion.div>

        <div className="mb-4 flex w-full gap-1 rounded-xl bg-white/5 p-1">
          {[
            { key: "signin", label: "Sign In" },
            { key: "signup", label: "Create Account" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setMode(t.key)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === t.key
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0c1222]/90 p-1 shadow-2xl backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {mode === "signin" ? (
              <SignIn
                key="signin"
                onSignInSuccess={onAuthSuccess}
                onSwitchToSignUp={() => setMode("signup")}
              />
            ) : (
              <SignUp
                key="signup"
                onSignUpSuccess={onAuthSuccess}
                onSwitchToSignIn={() => setMode("signin")}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
