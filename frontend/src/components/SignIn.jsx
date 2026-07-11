/**
 * =============================================================================
 *  NEXUS FRONTEND — src/components/SignIn.jsx
 * =============================================================================
 *  Companion login screen — same visual language as SignUp.
 * =============================================================================
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { AuthAPI, setToken } from "../lib/api.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn({ onSignInSuccess, onSwitchToSignUp }) {
  const [values, setValues] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ kind: null, message: "" });

  const errors = useMemo(() => {
    const e = {};
    if (!values.email || !emailRegex.test(values.email))
      e.email = "Enter a valid email.";
    if (!values.password || values.password.length < 1)
      e.password = "Password required.";
    return e;
  }, [values]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid || submitting) return;

    setSubmitting(true);
    setToast({ kind: null, message: "" });

    try {
      const res = await AuthAPI.login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      if (!res?.token || !res?.user)
        throw { message: "Malformed server response." };

      setToken(res.token);
      setToast({
        kind: "success",
        message: `Welcome back, ${res.user.fullName?.split(" ")[0] || "trader"}!`,
      });
      setTimeout(() => onSignInSuccess?.(res.user), 500);
    } catch (err) {
      setToast({
        kind: "error",
        message: err?.message || "Sign in failed. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.4 }}
      className="relative min-h-screen w-full overflow-hidden bg-[#070915] text-slate-100"
    >
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-24 top-1/3 h-[26rem] w-[26rem] rounded-full bg-emerald-500/15 blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast.message && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-xl border px-4 py-2.5 shadow-2xl backdrop-blur-xl ${
              toast.kind === "success"
                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                : "border-rose-400/25 bg-rose-500/10 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.kind === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className="w-full max-w-md"
        >
          <div className="relative rounded-2xl border border-white/5 bg-gray-900/60 p-7 shadow-2xl backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-400/10 opacity-60 blur-xl" />
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 shadow-lg shadow-indigo-500/25">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">
                    Welcome back
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Sign in to your Nexus account.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {[
                  {
                    id: "email",
                    label: "Email address",
                    icon: Mail,
                    type: "email",
                    autoComplete: "email",
                  },
                ].map((f) => (
                  <div key={f.id}>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {f.label}
                    </label>
                    <div className="flex items-center rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5">
                      <f.icon className="mr-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type={f.type}
                        autoComplete={f.autoComplete}
                        value={values[f.id]}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [f.id]: e.target.value }))
                        }
                        onBlur={() =>
                          setTouched((t) => ({ ...t, [f.id]: true }))
                        }
                        placeholder={f.label}
                        className="w-full bg-transparent text-sm font-medium text-slate-100 outline-none placeholder:text-slate-600"
                      />
                    </div>
                    {touched[f.id] && errors[f.id] && (
                      <div className="mt-1 flex items-center gap-1 pl-0.5 text-[11px] text-rose-400">
                        <AlertTriangle className="h-3 w-3" />
                        {errors[f.id]}
                      </div>
                    )}
                  </div>
                ))}

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                  <div className="flex items-center rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5">
                    <Lock className="mr-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      value={values.password}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, password: e.target.value }))
                      }
                      onBlur={() =>
                        setTouched((t) => ({ ...t, password: true }))
                      }
                      placeholder="Password"
                      className="w-full bg-transparent text-sm font-medium text-slate-100 outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="ml-2 rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    >
                      {showPw ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <div className="mt-1 flex items-center gap-1 pl-0.5 text-[11px] text-rose-400">
                      <AlertTriangle className="h-3 w-3" />
                      {errors.password}
                    </div>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={!submitting ? { scale: 1.01 } : undefined}
                  whileTap={!submitting ? { scale: 0.99 } : undefined}
                  className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </div>
          <p className="mt-5 text-center text-sm text-slate-400">
            New to Nexus?{" "}
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="font-semibold text-indigo-300 hover:text-indigo-200"
            >
              Create an account
            </button>
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
