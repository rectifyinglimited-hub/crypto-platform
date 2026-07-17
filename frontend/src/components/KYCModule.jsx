/**
 * =============================================================================
 *  NEXUS FRONTEND — src/components/KYCModule.jsx
 * =============================================================================
 *  Identity Verification modal.
 *    • Document types: National ID Card, Passport, Driver's License
 *    • Document photo upload + live selfie (camera or file)
 *    • Submits via /api/auth/kyc and returns the updated user
 * =============================================================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Camera,
  ImagePlus,
  SwitchCamera,
} from "lucide-react";
import { KycAPI } from "../lib/api.js";

const DOC_TYPES = [
  { value: "ID", label: "National ID Card" },
  { value: "Passport", label: "Passport" },
  { value: "DriversLicense", label: "Driver's License" },
];

const MAX_BYTES = 8 * 1024 * 1024;

/** Compress an image File/Blob to a JPEG data URL for admin preview */
function fileToDataUrl(file, { maxEdge = 960, quality = 0.72 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file"));
      return;
    }
    if (file.type === "application/pdf") {
      // PDF — store a lightweight label (admin shows filename fallback)
      resolve(`pdf:${file.name}`);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function canvasToDataUrl(video, { maxEdge = 720, quality = 0.75 } = {}) {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const scale = Math.min(1, maxEdge / Math.max(vw, vh));
  const w = Math.max(1, Math.round(vw * scale));
  const h = Math.max(1, Math.round(vh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  // Mirror so preview matches front-camera UX
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

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

function SelfieCapture({ preview, onCapture, onClear, error }) {
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [camError, setCamError] = useState("");
  const [busy, setBusy] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks()?.forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const openCamera = async (mode = facingMode) => {
    setCamError("");
    setBusy(true);
    try {
      stopStream();
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera is not supported on this device.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setFacingMode(mode);
      // Attach after paint
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play?.().catch(() => {});
        }
      });
    } catch (err) {
      setCamError(
        err?.name === "NotAllowedError"
          ? "Camera permission denied. Use Upload Photo instead."
          : err?.message || "Could not open camera."
      );
      setCameraOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const snap = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const dataUrl = canvasToDataUrl(video);
    onCapture(dataUrl);
    stopStream();
    setCameraOpen(false);
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setCamError("File too large (>8MB).");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setCamError("Please upload an image file.");
      return;
    }
    try {
      setBusy(true);
      const dataUrl = await fileToDataUrl(file, { maxEdge: 720, quality: 0.75 });
      onCapture(dataUrl);
      setCamError("");
    } catch {
      setCamError("Could not process that photo.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => () => stopStream(), [stopStream]);

  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        Selfie Verification <span className="text-rose-400">*</span>
      </label>
      <p className="mb-2 text-[10px] text-slate-500">
        Take a live selfie with your camera, or upload a clear face photo.
      </p>

      {preview ? (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-400/25 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-3">
            <img
              src={preview}
              alt="Selfie preview"
              className="h-24 w-24 shrink-0 rounded-xl object-cover ring-2 ring-emerald-400/40"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Selfie ready
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                This photo will be reviewed alongside your document.
              </p>
              <button
                type="button"
                onClick={onClear}
                className="mt-2 text-[11px] font-medium text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
              >
                Remove & retake
              </button>
            </div>
          </div>
        </div>
      ) : cameraOpen ? (
        <div className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-black/40">
          <div className="relative aspect-[4/3] bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-40 w-40 rounded-full border-2 border-dashed border-white/40" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 p-3">
            <button
              type="button"
              onClick={() => {
                stopStream();
                setCameraOpen(false);
              }}
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                openCamera(facingMode === "user" ? "environment" : "user")
              }
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
            >
              <SwitchCamera className="h-3.5 w-3.5" /> Flip
            </button>
            <button
              type="button"
              onClick={snap}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950"
            >
              <Camera className="h-3.5 w-3.5" /> Capture
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => openCamera("user")}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-5 text-cyan-100 transition hover:bg-cyan-500/15 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
            <span className="text-xs font-semibold">Open Camera</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-5 text-slate-200 transition hover:bg-white/[0.06] disabled:opacity-60"
          >
            <ImagePlus className="h-5 w-5 text-slate-400" />
            <span className="text-xs font-semibold">Upload Photo</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {(error || camError) && (
        <p className="mt-1.5 text-[10px] text-rose-300">{error || camError}</p>
      )}
    </div>
  );
}

export default function KYCModule({ user, open, onClose, onUpdated }) {
  const kyc = user?.kyc || { status: "unverified" };
  const canSubmit = kyc.status === "unverified" || kyc.status === "rejected";

  const [fullName, setFullName] = useState(kyc.fullName || user?.fullName || "");
  const [docType, setDocType] = useState(
    kyc.docType === "CNIC" ? "" : kyc.docType || ""
  );
  const [docNumber, setDocNumber] = useState(kyc.docNumber || "");
  const [file, setFile] = useState(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
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
    if (!selfiePreview) e.selfie = "Selfie verification is required.";
    return e;
  }, [fullName, docType, docNumber, file, selfiePreview]);
  const valid = Object.keys(errors).length === 0;

  const handleFile = async (f) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setToast({ kind: "error", message: "File too large (>8MB)." });
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      try {
        const url = await fileToDataUrl(f, { maxEdge: 960, quality: 0.72 });
        setDocPreviewUrl(url);
      } catch {
        setDocPreviewUrl(null);
      }
    } else {
      setDocPreviewUrl(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid || !canSubmit || submitting) return;
    setSubmitting(true);
    try {
      let documentPreview = docPreviewUrl;
      if (!documentPreview && file) {
        documentPreview = await fileToDataUrl(file);
      }
      if (!documentPreview && file) {
        documentPreview = `${file.name} (${Math.round(file.size / 1024)} KB)`;
      }

      const res = await KycAPI.submit({
        fullName: fullName.trim(),
        docType,
        docNumber: docNumber.trim(),
        documentPreview,
        selfiePreview,
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
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/5 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-2xl"
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
                          placeholder="Document / passport number"
                          className="w-full bg-transparent font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document photo */}
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
                      className="cursor-pointer rounded-2xl border border-dashed p-4 text-center"
                    >
                      <input
                        ref={inputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                      />
                      {file ? (
                        <div className="flex flex-col items-center gap-2">
                          {docPreviewUrl &&
                          docPreviewUrl.startsWith("data:image") ? (
                            <img
                              src={docPreviewUrl}
                              alt="Document preview"
                              className="h-28 w-full max-w-[220px] rounded-xl object-cover ring-1 ring-white/10"
                            />
                          ) : (
                            <div className="flex items-center justify-center gap-2 text-emerald-200">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm font-semibold">
                                {file.name}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>
                              {file.name} · {Math.round(file.size / 1024)} KB
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFile(null);
                                setDocPreviewUrl(null);
                              }}
                              className="rounded p-0.5 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
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
                    {errors.file && !file && (
                      <p className="mt-1 text-[10px] text-rose-300">
                        {errors.file}
                      </p>
                    )}
                  </div>

                  <SelfieCapture
                    preview={selfiePreview}
                    onCapture={setSelfiePreview}
                    onClear={() => setSelfiePreview(null)}
                    error={errors.selfie && !selfiePreview ? errors.selfie : ""}
                  />

                  <motion.button
                    type="submit"
                    disabled={!valid || submitting}
                    whileHover={
                      valid && !submitting ? { scale: 1.01 } : undefined
                    }
                    whileTap={
                      valid && !submitting ? { scale: 0.99 } : undefined
                    }
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
                    Your document and selfie are stored securely. Nexus never
                    shares KYC information with third parties.
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
