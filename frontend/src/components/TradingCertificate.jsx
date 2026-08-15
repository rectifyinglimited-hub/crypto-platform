/**
 * Click-to-verify Binomo trading certificates (membership + execution quality).
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, BadgeCheck, ShieldCheck } from "lucide-react";
import { BRAND, COMPANY, CERTIFICATES } from "../lib/brand.js";

export function openCertificate(id = "ifc-a") {
  window.dispatchEvent(
    new CustomEvent("nexus:open-certificate", { detail: { id } })
  );
}

function Seal({ label }) {
  return (
    <div className="relative grid h-20 w-20 place-items-center sm:h-24 sm:w-24">
      <svg viewBox="0 0 100 100" className="absolute inset-0 text-[#b8860b]">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M50 18 L54 38 L74 38 L58 50 L64 70 L50 58 L36 70 L42 50 L26 38 L46 38 Z"
          fill="currentColor"
        />
      </svg>
      <span className="relative mt-10 px-1 text-center text-[7px] font-bold uppercase tracking-wider text-[#7a5a12] sm:text-[8px]">
        {label}
      </span>
    </div>
  );
}

export function CertificateSheet({ cert, compact = false }) {
  return (
    <div
      className={`relative overflow-hidden rounded-sm border-[6px] border-double border-[#c9a227] bg-[#fbf6ea] text-[#1b2433] shadow-[0_20px_50px_rgba(0,0,0,0.35)] ${
        compact ? "p-3 sm:p-4" : "p-5 sm:p-8"
      }`}
    >
      <div className="pointer-events-none absolute inset-2 border border-[#c9a227]/50" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className={`font-semibold uppercase tracking-[0.28em] text-[#b8860b] ${
                compact ? "text-[8px]" : "text-[10px] sm:text-xs"
              }`}
            >
              {cert.issuer}
            </div>
            <div
              className={`mt-1 font-serif font-bold leading-tight text-[#1a2744] ${
                compact ? "text-sm" : "text-xl sm:text-3xl"
              }`}
            >
              {cert.title}
            </div>
            <div
              className={`mt-0.5 font-semibold text-[#8a6a1f] ${
                compact ? "text-[10px]" : "text-sm"
              }`}
            >
              {cert.subtitle}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-[#ffc107] sm:h-10 sm:w-10">
              <svg viewBox="0 0 48 48" className="h-6 w-6" fill="#111">
                <g transform="translate(24 24) rotate(-40)">
                  <rect x="-16" y="-11.2" width="32" height="8.4" rx="4.2" />
                  <rect x="-16" y="2.8" width="32" height="8.4" rx="4.2" />
                </g>
              </svg>
            </span>
            {!compact && (
              <span className="font-display text-lg font-extrabold lowercase text-[#1a1400]">
                {BRAND.name.toLowerCase()}
              </span>
            )}
          </div>
        </div>

        <p
          className={`mt-3 leading-relaxed text-[#334155] ${
            compact ? "line-clamp-3 text-[9px]" : "text-sm sm:text-[15px]"
          }`}
        >
          {cert.body}
        </p>

        <div className={`mt-3 ${compact ? "space-y-0.5 text-[9px]" : "space-y-1 text-sm"}`}>
          <Row compact={compact} k="Issued to" v={`${cert.holder} · ${COMPANY.legalName}`} />
          <Row compact={compact} k="Registration" v={COMPANY.companyNo} />
          <Row compact={compact} k="Certificate No." v={cert.number} />
          <Row compact={compact} k="Member since" v={cert.registered} />
          <Row compact={compact} k="Valid through" v={cert.validThrough} />
          <Row compact={compact} k="Status" v={cert.status} gold />
        </div>

        {!compact && (
          <p className="mt-3 text-xs font-semibold text-[#7a5a12]">{cert.extra}</p>
        )}

        <div className={`mt-4 flex items-end justify-between ${compact ? "mt-2" : "mt-6"}`}>
          <Seal label={compact ? "Seal" : "Official seal"} />
          <div className="text-right">
            <div
              className={`font-serif italic text-[#1a2744] ${
                compact ? "text-xs" : "text-xl"
              }`}
            >
              Authorized
            </div>
            <div className={`text-[#64748b] ${compact ? "text-[8px]" : "text-[10px]"}`}>
              Compliance desk · {BRAND.name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, compact, gold }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-[#64748b] sm:w-36">{k}</span>
      <span className={`font-semibold ${gold ? "text-[#b8860b]" : "text-[#1a2744]"} ${compact ? "truncate" : ""}`}>
        {v}
      </span>
    </div>
  );
}

export function CertificateThumb({ cert, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left"
      title="Click to verify certificate"
    >
      <div className="overflow-hidden rounded-xl border border-[#ffc107]/30 bg-black/40 p-2 transition group-hover:border-[#ffc107] group-hover:shadow-[0_0_24px_rgba(255,193,7,0.25)]">
        <CertificateSheet cert={cert} compact />
        <div className="mt-2 flex items-center justify-between px-1 pb-1 text-[11px] font-semibold text-[#ffc107]">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Click to verify
          </span>
          <span className="text-white/40">{cert.number}</span>
        </div>
      </div>
    </button>
  );
}

export function CertificateLightbox({ open, certId, onClose }) {
  const cert = CERTIFICATES.find((c) => c.id === certId) || CERTIFICATES[0];
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Certificate verification"
    >
      <div
        className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
            <BadgeCheck className="h-4 w-4" />
            Verified · {cert.status}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <CertificateSheet cert={cert} />
        <div className="mt-3 rounded-xl border border-white/10 bg-black/50 p-4 text-xs text-white/70">
          <div className="font-bold uppercase tracking-wider text-white/40">
            Public verification
          </div>
          <p className="mt-1 leading-relaxed">
            Certificate <span className="font-mono text-[#ffc107]">{cert.number}</span> is
            issued to {COMPANY.legalName} ({BRAND.name}). Registered {COMPANY.companyNo}.
            Anyone can open this page and confirm the same document.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function CertificateHost() {
  const [open, setOpen] = useState(false);
  const [certId, setCertId] = useState("ifc-a");

  useEffect(() => {
    const onOpen = (e) => {
      setCertId(e?.detail?.id || "ifc-a");
      setOpen(true);
    };
    window.addEventListener("nexus:open-certificate", onOpen);
    return () => window.removeEventListener("nexus:open-certificate", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <CertificateLightbox
      open={open}
      certId={certId}
      onClose={() => setOpen(false)}
    />
  );
}
