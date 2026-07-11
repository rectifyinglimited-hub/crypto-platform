/**
 * =============================================================================
 *  NEXUS FRONTEND — src/components/KYCModule.jsx
 * =============================================================================
 *  Identity Verification (Profile Lock) modal.
 *    • Captures: fullName, docType, docNumber, and a mock drag-and-drop file.
 *    • Displays current KYC status with themed banner.
 *    • Submits via /api/auth/kyc and returns the updated user.
 * =============================================================================
 */

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  UploadCloud,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  BadgeCheck,
  User as UserIcon,
  CreditCard,
  Hash,
} from "lucide-react";
import { KycAPI } from "../lib/api.js";

const DOC_TYPES = [
  { value: "CNIC", label: "CNIC (Pakistan)" },
  { value: "Passport", label: "Passport" },
  { value: "ID", label: "National ID Card" },
  { value: "DriversLicense", label: "Driver's License" },
];

const StatusBanner = ({ status, reviewerNote }) => {
  const map = {
    unverified: {
      cls: "border-slate-400/25 bg-slate-500/10 text-slate-300",
      icon: ShieldCheck,
      title: "Unverified account",
      body: "Verify your identity to unlock full trading and withdrawal limits.",
    },
    pending: {
      cls: "border-amber-400/25 bg-amber-500/10 text-amber-200",
      icon: Clock,
      title: "Review in progress",
      body: "Your KYC package is being reviewed. Most decisions land within a few hours.",
    },
    approved: {
      cls: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
      icon: BadgeCheck,
      title: "Identity verified",
      body: "Your profile is locked and verified. Full account features are enabled.",
    },
    rejected: {
      cls: "border-rose-400/25 bg-rose-500/10 text-rose-200",
      icon: AlertTriangle,
      title: "Submission rejected",
      body:
        reviewerNote ||
        "Your KYC submission was rejected. Please resubmit with clearer details.",
    },
  };
  const meta = map[status] || map.unverified;
  const Icon = meta.icon;
  return (
    <div
      className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3 ${meta.cls}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="text-sm font-semibold">{meta.title}</div>
        <div className="mt-0.5 text-[11px] opacity-80">{meta.body}</div>
      </div>
    </div>
  );
};

export default function KYCModule({ user, open, onClose, onUpdated }) {
  const kyc = user?.kyc || { status: "unverified" };
  const canSubmit = kyc.status === "unverified" || kyc.status === "rejected";

  const [fullName, setFullName] = useState(kyc.fullName || user?.fullName || "");
  const [docType, setDocType] = useState(kyc.docType || "");
  const [docNumber, setDocNumber] = useState(kyc.docNumber || "");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ kind: null, message: "" });
  const inputRef = useRef(null);

  const errors = useMemo(() => {
    const e = {};
    if (!fullName || fullName.trim().length < 2)
      e.fullName = "Enter your full name.";
    if (!docType) e.docType = "Choose a document type.";
    if (!docNumber || docNumber.trim().length < 4)
      e.docNumber = "Document number too short.";
    if (!file) e.file = "Attach an image of your document.";
    return e;
  }, [fullName, docType, docNumber, file]);
  const valid = Object.keys(errors).length === 0;

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      setToast({ kind: "error", message: "File too large (>8MB)." });
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid || !canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const res = await KycAPI.submit({
        fullName: fullName.trim(),
        docType,
        docNumber: docNumber.trim(),
        // We don't upload the raw file here — only a mock reference so the
        // admin console has something to display.
        documentPreview: file
          ? `${file.name} (${Math.round(file.size / 1024)} KB)`
          : null,
      });
      setToast({ kind: "success", message: res.message || "Submitted." });
      onUpdated?.(res.user);
      setTimeout(() => onClose?.(), 800);
    } catch (err) {
      setToast({
        kind: "error",
        message: err?.message || "Submission failed. Try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/5 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-400/10 opacity-60 blur-xl" />
            <div className="relative">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 shadow-lg shadow-indigo-500/25">
                    <ShieldCheck className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">
                      Identity Verification
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Profile Lock · Nexus KYC
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <StatusBanner
                status={kyc.status}
                reviewerNote={kyc.reviewerNote}
              />

              {!canSubmit && (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-slate-400">
                  {kyc.status === "approved" ? (
                    <>
                      Verified as{" "}
                      <span className="font-semibold text-slate-200">
                        {kyc.fullName}
                      </span>{" "}
                      · {kyc.docType} ending in{" "}
                      <span className="font-mono">
                        {kyc.docNumber?.slice(-4)}
                      </span>
                    </>
                  ) : (
                    <>Please wait for the admin team to complete the review.</>
                  )}
                </div>
              )}

              {canSubmit && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence>
                    {toast.message && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                          toast.kind === "success"
                            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                            : "border-rose-400/25 bg-rose-500/10 text-rose-200"
                        }`}
                      >
                        {toast.kind === "success" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        )}
                        {toast.message}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Legal Full Name
                    </label>
                    <div className="flex items-center rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                      <UserIcon className="mr-2 h-4 w-4 text-slate-500" />
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="As shown on your document"
                        className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Document Type
                      </label>
                      <div className="flex items-center rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                        <CreditCard className="mr-2 h-4 w-4 text-slate-500" />
                        <select
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                          className="w-full appearance-none bg-transparent text-sm text-slate-100 outline-none"
                        >
                          <option value="" className="bg-slate-900">
                            Select…
                          </option>
                          {DOC_TYPES.map((d) => (
                            <option
                              key={d.value}
                              value={d.value}
                              className="bg-slate-900"
                            >
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Document Number
                      </label>
                      <div className="flex items-center rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                        <Hash className="mr-2 h-4 w-4 text-slate-500" />
                        <input
                          value={docNumber}
                          onChange={(e) => setDocNumber(e.target.value)}
                          placeholder="123456-7890123-4"
                          className="w-full bg-transparent font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Drag & drop uploader */}
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Document Photo
                    </label>
                    <motion.div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        handleFile(e.dataTransfer?.files?.[0]);
                      }}
                      onClick={() => inputRef.current?.click()}
                      animate={{
                        borderColor: dragOver
                          ? "rgba(16, 185, 129, 0.6)"
                          : "rgba(255,255,255,0.06)",
                        backgroundColor: dragOver
                          ? "rgba(16, 185, 129, 0.06)"
                          : "rgba(255,255,255,0.02)",
                      }}
                      className="cursor-pointer rounded-2xl border border-dashed p-6 text-center"
                    >
                      <input
                        ref={inputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                      />
                      {file ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-200">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-semibold">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({Math.round(file.size / 1024)} KB)
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                            }}
                            className="ml-2 rounded p-0.5 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="mx-auto mb-2 h-6 w-6 text-slate-500" />
                          <div className="text-xs font-semibold text-slate-300">
                            Drag & drop your document
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            or click to browse · PNG, JPG, PDF · max 8MB
                          </div>
                        </>
                      )}
                    </motion.div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={!valid || submitting}
                    whileHover={valid && !submitting ? { scale: 1.01 } : undefined}
                    whileTap={valid && !submitting ? { scale: 0.99 } : undefined}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" /> Submit for Review
                      </>
                    )}
                  </motion.button>
                  <p className="text-center text-[10px] text-slate-500">
                    Your document is stored securely. Nexus never shares KYC
                    information with third parties.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
