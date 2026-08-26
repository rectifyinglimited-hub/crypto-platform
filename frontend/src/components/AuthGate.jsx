/**
 * Centered Sign-In / Sign-Up entry gate — reached from the public Landing Page.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import SignIn from "./SignIn.jsx";
import SignUp from "./SignUp.jsx";

export default function AuthGate({
  onAuthSuccess,
  onBack,
  initialMode = "signin",
}) {
  const [mode, setMode] = useState(initialMode === "signup" ? "signup" : "signin");

  useEffect(() => {
    setMode(initialMode === "signup" ? "signup" : "signin");
  }, [initialMode]);

  return (
    <div className="nx-bg-auth relative min-h-screen w-full overflow-x-hidden overflow-y-auto text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 pb-10 pt-16 sm:px-5 sm:pt-20">
        {typeof onBack === "function" && (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-3 top-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white sm:left-5 sm:top-5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Landing
          </button>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 w-full text-center sm:mb-5"
        >
          <h1 className="text-base font-semibold tracking-tight text-slate-200 sm:text-lg">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-slate-400 sm:text-sm">
            {mode === "signin"
              ? "Sign in to access your trading wallet and live markets."
              : "Register to unlock the seconds trading terminal."}
          </p>
        </motion.div>

        <div className="mb-3 flex w-full gap-1 rounded-xl bg-white/5 p-1 sm:mb-4">
          {[
            { key: "signin", label: "Sign In" },
            { key: "signup", label: "Register" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setMode(t.key)}
              className={`min-h-11 flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
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
                embedded
                onSignInSuccess={onAuthSuccess}
                onSwitchToSignUp={() => setMode("signup")}
              />
            ) : (
              <SignUp
                key="signup"
                embedded
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
