/**
 * =============================================================================
 *  NEXUS FRONTEND — src/components/SignUp.jsx
 * =============================================================================
 *  Premium glassmorphic sign-up screen for the Nexus crypto platform.
 *    • Medium centered card, deep-space translucent surface, ambient blobs.
 *    • 2-column grid: Full name / Username, Phone / Country, Password / Confirm.
 *    • Icon-inlined inputs, password visibility toggle, live strength meter.
 *    • Strict callback on 201: store token, invoke onSignUpSuccess(user).
 * =============================================================================
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User as UserIcon,
  AtSign,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Globe2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Ticket,
} from "lucide-react";

import { AuthAPI, setToken } from "../lib/api.js";

// ---------------------------------------------------------------------------
// Static
// ---------------------------------------------------------------------------
const COUNTRIES = [
  { code: "US", name: "United States", dial: "+1" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "DE", name: "Germany", dial: "+49" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "PK", name: "Pakistan", dial: "+92" },
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "BR", name: "Brazil", dial: "+55" },
  { code: "SG", name: "Singapore", dial: "+65" },
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_.-]{3,24}$/;

const INVITE_REQUIRED_MESSAGE =
  "Valid Invitation Code is required to create an account.";

const validate = (v) => {
  const e = {};
  if (!v.fullName || v.fullName.trim().length < 2)
    e.fullName = "Enter your full name.";
  if (!v.username || !usernameRegex.test(v.username))
    e.username = "3-24 chars: letters, numbers, . _ -";
  if (!v.email || !emailRegex.test(v.email))
    e.email = "Enter a valid email address.";
  if (!v.password || v.password.length < 8)
    e.password = "Minimum 8 characters.";
  else if (!/[A-Z]/.test(v.password))
    e.password = "Add an uppercase letter.";
  else if (!/[a-z]/.test(v.password))
    e.password = "Add a lowercase letter.";
  else if (!/\d/.test(v.password)) e.password = "Add a number.";
  if (v.confirmPassword !== v.password)
    e.confirmPassword = "Passwords do not match.";
  if (v.phone && v.phone.replace(/\D/g, "").length < 4)
    e.phone = "Phone looks too short.";
  if (!v.inviteCode || !String(v.inviteCode).trim())
    e.inviteCode = INVITE_REQUIRED_MESSAGE;
  return e;
};

const scorePassword = (pw = "") => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};

// ---------------------------------------------------------------------------
// Animated input primitive — compact, grid-friendly.
// ---------------------------------------------------------------------------
const Field = ({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  touched,
  rightSlot,
  autoComplete,
  inputMode,
  disabled,
  accent = "indigo",
  required = false,
}) => {
  const [focused, setFocused] = useState(false);
  const showError = touched && error;
  const focusColor =
    accent === "emerald"
      ? "rgba(16, 185, 129, 0.7)"
      : "rgba(99, 102, 241, 0.75)";
  const focusRing =
    accent === "emerald"
      ? "0 0 0 4px rgba(16, 185, 129, 0.12)"
      : "0 0 0 4px rgba(99, 102, 241, 0.14)";

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <motion.div
        initial={false}
        animate={{
          borderColor: showError
            ? "rgba(244, 63, 94, 0.55)"
            : focused
            ? focusColor
            : "rgba(255, 255, 255, 0.06)",
          boxShadow: focused
            ? showError
              ? "0 0 0 4px rgba(244, 63, 94, 0.12)"
              : focusRing
            : "0 0 0 0 rgba(0,0,0,0)",
        }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="flex items-center rounded-xl border bg-white/[0.02] px-3.5 py-2.5 backdrop-blur-sm"
      >
        {Icon && (
          <Icon
            className={`mr-2.5 h-4 w-4 shrink-0 ${
              showError
                ? "text-rose-400"
                : focused
                ? accent === "emerald"
                  ? "text-emerald-300"
                  : "text-indigo-300"
                : "text-slate-500"
            }`}
          />
        )}
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          autoComplete={autoComplete}
          inputMode={inputMode}
          disabled={disabled}
          className="w-full bg-transparent text-sm font-medium text-slate-100 outline-none placeholder:text-slate-600 disabled:opacity-60"
          placeholder={label}
        />
        {rightSlot && <div className="ml-2 flex items-center">{rightSlot}</div>}
      </motion.div>
      <AnimatePresence initial={false}>
        {showError && (
          <motion.div
            initial={{ opacity: 0, y: -2, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -2, height: 0 }}
            transition={{ duration: 0.16 }}
            className="mt-1 flex items-center gap-1 pl-0.5 text-[11px] text-rose-400"
          >
            <AlertTriangle className="h-3 w-3" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Country <select> with matching visual language
// ---------------------------------------------------------------------------
const CountryField = ({ value, onChange }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className="w-full">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Country
      </label>
      <motion.div
        initial={false}
        animate={{
          borderColor: focused
            ? "rgba(16, 185, 129, 0.7)"
            : "rgba(255, 255, 255, 0.06)",
          boxShadow: focused
            ? "0 0 0 4px rgba(16, 185, 129, 0.12)"
            : "0 0 0 0 rgba(0,0,0,0)",
        }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="flex items-center rounded-xl border bg-white/[0.02] px-3.5 py-2.5 backdrop-blur-sm"
      >
        <Globe2
          className={`mr-2.5 h-4 w-4 shrink-0 ${
            focused ? "text-emerald-300" : "text-slate-500"
          }`}
        />
        <select
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={onChange}
          className="w-full appearance-none bg-transparent text-sm font-medium text-slate-100 outline-none"
        >
          <option value="" className="bg-slate-900">
            Select country
          </option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.name} className="bg-slate-900">
              {c.name} ({c.dial})
            </option>
          ))}
        </select>
      </motion.div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Password strength meter
// ---------------------------------------------------------------------------
const StrengthMeter = ({ password }) => {
  const score = scorePassword(password);
  const labels = ["Too weak", "Weak", "Fair", "Strong", "Excellent"];
  const colors = [
    "from-rose-500 to-rose-400",
    "from-orange-500 to-amber-400",
    "from-yellow-500 to-yellow-300",
    "from-emerald-500 to-emerald-300",
    "from-indigo-500 via-emerald-400 to-cyan-300",
  ];
  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{
              opacity: i < score ? 1 : 0.15,
              scaleX: i < score ? 1 : 0.85,
            }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className={`h-1 flex-1 origin-left rounded-full bg-gradient-to-r ${
              colors[Math.max(0, score - 1)] || colors[0]
            }`}
          />
        ))}
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {password ? labels[score] || labels[0] : "Password strength"}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
const Toast = ({ kind, message, onClose }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className={`pointer-events-auto fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-xl border px-4 py-2.5 shadow-2xl backdrop-blur-xl ${
          kind === "success"
            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
            : "border-rose-400/25 bg-rose-500/10 text-rose-200"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {kind === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{message}</span>
          <button
            onClick={onClose}
            className="ml-2 text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ---------------------------------------------------------------------------
// Ambient blobs
// ---------------------------------------------------------------------------
const AmbientBlobs = () => (
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
    <motion.div
      className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl"
      animate={{ x: [0, 30, 0], y: [0, -30, 0] }}
      transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SignUp({ onSignUpSuccess, onSwitchToSignIn }) {
  const [values, setValues] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    country: "",
    password: "",
    confirmPassword: "",
    inviteCode: "",
  });
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ kind: null, message: "" });

  const errors = useMemo(() => validate(values), [values]);
  const isValid = Object.keys(errors).length === 0;

  const bind = (key) => ({
    value: values[key],
    onChange: (e) => setValues((v) => ({ ...v, [key]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
    error: errors[key],
    touched: touched[key],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Force-touch all keys so errors surface on submit
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
    if (!isValid || submitting) return;

    setSubmitting(true);
    setToast({ kind: null, message: "" });

    try {
      const res = await AuthAPI.register({
        fullName: values.fullName.trim(),
        username: values.username.trim().toLowerCase(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        phone: values.phone || null,
        country: values.country || null,
        inviteCode: String(values.inviteCode || "").trim().toUpperCase(),
      });

      // Strict success contract — must have a token AND a user object.
      if (!res?.token || !res?.user) {
        throw {
          message: "Malformed server response. Please try again.",
        };
      }

      setToken(res.token);
      setToast({
        kind: "success",
        message: `Welcome, ${res.user.fullName?.split(" ")[0] || "trader"}!`,
      });

      // Small delay so the user sees the success toast before we transition.
      setTimeout(() => onSignUpSuccess?.(res.user), 550);
    } catch (err) {
      const inviteDenied =
        /invitation code/i.test(String(err?.message || "")) ||
        err?.error === "ForbiddenError";
      const message = inviteDenied
        ? INVITE_REQUIRED_MESSAGE
        : err?.message ||
          (Array.isArray(err?.details) && err.details[0]?.message) ||
          "Registration failed. Please try again.";
      setToast({ kind: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4 }}
      className="relative min-h-screen w-full overflow-hidden bg-[#070915] text-slate-100"
    >
      <AmbientBlobs />
      <Toast
        kind={toast.kind}
        message={toast.message}
        onClose={() => setToast({ kind: null, message: "" })}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className="w-full max-w-2xl"
        >
          <div className="relative rounded-2xl border border-white/5 bg-gray-900/60 p-7 shadow-2xl backdrop-blur-sm">
            {/* Corner glow */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-400/10 opacity-60 blur-xl" />

            <div className="relative">
              {/* Header */}
              <div className="mb-6 flex items-center gap-3">
                <motion.div
                  initial={{ rotate: -12, scale: 0.6, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 shadow-lg shadow-indigo-500/25"
                >
                  <Sparkles className="h-4.5 w-4.5 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">
                    Create your Nexus account
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Trade smarter. Track sharper. Start in under a minute.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="fullName"
                    label="Full name"
                    icon={UserIcon}
                    autoComplete="name"
                    {...bind("fullName")}
                  />
                  <Field
                    id="username"
                    label="Username"
                    icon={AtSign}
                    autoComplete="username"
                    {...bind("username")}
                  />
                </div>

                <Field
                  id="email"
                  label="Email address"
                  icon={Mail}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  {...bind("email")}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="phone"
                    label="Phone"
                    icon={Phone}
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    accent="emerald"
                    {...bind("phone")}
                  />
                  <CountryField
                    value={values.country}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, country: e.target.value }))
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Field
                      id="password"
                      label="Password"
                      icon={Lock}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      {...bind("password")}
                      rightSlot={
                        <motion.button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          whileTap={{ scale: 0.9 }}
                          className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        >
                          {showPassword ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </motion.button>
                      }
                    />
                    <StrengthMeter password={values.password} />
                  </div>
                  <Field
                    id="confirmPassword"
                    label="Confirm password"
                    icon={ShieldCheck}
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    accent="emerald"
                    {...bind("confirmPassword")}
                    rightSlot={
                      <motion.button
                        type="button"
                        onClick={() => setShowConfirm((s) => !s)}
                        whileTap={{ scale: 0.9 }}
                        className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      >
                        {showConfirm ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </motion.button>
                    }
                  />
                </div>

                <Field
                  id="inviteCode"
                  label="Invitation Code"
                  icon={Ticket}
                  required
                  autoComplete="off"
                  {...bind("inviteCode")}
                />

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={!submitting ? { scale: 1.01 } : undefined}
                  whileTap={!submitting ? { scale: 0.99 } : undefined}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                  className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-70"
                >
                  <motion.span
                    className="pointer-events-none absolute inset-0 bg-white/20"
                    initial={{ x: "-120%" }}
                    animate={{ x: submitting ? "120%" : "-120%" }}
                    transition={{
                      duration: 1.2,
                      repeat: submitting ? Infinity : 0,
                      ease: "easeInOut",
                    }}
                  />
                  <AnimatePresence mode="wait" initial={false}>
                    {submitting ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="flex items-center gap-2"
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating account…
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="flex items-center gap-2"
                      >
                        Create account
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                <p className="pt-0.5 text-center text-[11px] text-slate-500">
                  By continuing you agree to the Nexus Terms and Privacy Policy.
                </p>
              </form>
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="font-semibold text-indigo-300 hover:text-indigo-200"
            >
              Sign in
            </button>
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
