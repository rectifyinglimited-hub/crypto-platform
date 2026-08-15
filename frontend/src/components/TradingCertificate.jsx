/**
 * Official Binomo / Dolphin Corp LLC business authorization certificate.
 * Fashion-Nova-style public page: click the document to inspect it full-size.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import { BRAND, COMPANY, AUTHORIZATION as AUTH } from "../lib/brand.js";

export function openCertificate() {
  window.dispatchEvent(new CustomEvent("nexus:open-certificate"));
}

function BinomoMark({ className = "h-8 w-8", fill = "#111" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill={fill} aria-hidden>
      <g transform="translate(24 24) rotate(-40)">
        <rect x="-16" y="-11.2" width="32" height="8.4" rx="4.2" />
        <rect x="-16" y="2.8" width="32" height="8.4" rx="4.2" />
      </g>
    </svg>
  );
}

function OfficialStamp({ ring, center, sub, id }) {
  const pathId = `stamp-ring-${id}`;
  return (
    <svg viewBox="0 0 140 140" className="h-[108px] w-[108px] sm:h-[124px] sm:w-[124px]">
      <defs>
        <path
          id={pathId}
          d="M70,70 m0,-52 a52,52 0 1,1 0,104 a52,52 0 1,1 0,-104"
        />
      </defs>
      <circle cx="70" cy="70" r="66" fill="none" stroke="#1a1a1a" strokeWidth="2.6" />
      <circle cx="70" cy="70" r="61" fill="none" stroke="#c9a227" strokeWidth="3.2" />
      <circle cx="70" cy="70" r="56" fill="none" stroke="#1a1a1a" strokeWidth="1.1" />
      <text
        fill="#1a1a1a"
        fontSize="8.2"
        fontWeight="700"
        letterSpacing="2.2"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <textPath href={`#${pathId}`} startOffset="0%">
          {ring}
        </textPath>
      </text>
      <circle cx="70" cy="70" r="34" fill="none" stroke="#1a1a1a" strokeWidth="1.1" />
      <text
        x="70"
        y="66"
        textAnchor="middle"
        fill="#1a1a1a"
        fontSize="9"
        fontWeight="800"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {center}
      </text>
      <text
        x="70"
        y="80"
        textAnchor="middle"
        fill="#1a1a1a"
        fontSize="7.2"
        fontWeight="700"
        letterSpacing="1.4"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {sub}
      </text>
    </svg>
  );
}

function Cursive({ children }) {
  return (
    <div
      className="text-[26px] leading-none text-[#111] sm:text-[30px]"
      style={{ fontFamily: "Segoe Script, Brush Script MT, Lucida Handwriting, cursive" }}
    >
      {children}
    </div>
  );
}

function Corner({ className }) {
  return (
    <span
      className={`pointer-events-none absolute h-7 w-7 border-[#111] sm:h-9 sm:w-9 ${className}`}
    />
  );
}

export function OfficialCertificateDocument() {
  const address = [COMPANY.legalName, ...COMPANY.addressLines, COMPANY.jurisdiction];

  return (
    <div className="relative bg-white px-4 py-6 text-[#111] sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute inset-2 border-[3px] border-[#111] sm:inset-3" />
      <div className="pointer-events-none absolute inset-[11px] border border-[#111] sm:inset-[14px]" />
      <Corner className="left-4 top-4 border-l-[3px] border-t-[3px] sm:left-5 sm:top-5" />
      <Corner className="right-4 top-4 border-r-[3px] border-t-[3px] sm:right-5 sm:top-5" />
      <Corner className="bottom-4 left-4 border-b-[3px] border-l-[3px] sm:bottom-5 sm:left-5" />
      <Corner className="bottom-4 right-4 border-b-[3px] border-r-[3px] sm:bottom-5 sm:right-5" />

      <div className="relative">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-[#ffc107]">
              <BinomoMark className="h-6 w-6" />
            </span>
            <span className="text-2xl font-extrabold tracking-tight sm:text-4xl">
              {BRAND.name.toUpperCase()}
            </span>
          </div>
          <div className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.18em] sm:text-sm">
            {AUTH.documentTitle}
          </div>
        </div>

        <div className="mt-6 grid gap-4 text-[11px] leading-relaxed sm:grid-cols-2 sm:text-[13px]">
          <div className="space-y-0.5">
            {address.map((line) => (
              <div key={line}>{line}</div>
            ))}
            <div className="pt-1">Company number: {COMPANY.companyNo}</div>
            <div>Registration Number: {AUTH.registrationNo}</div>
          </div>
          <div className="sm:text-right">
            <div>Issue Date: {AUTH.issueDate}</div>
            <div>Jurisdiction: {COMPANY.jurisdiction}</div>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-[12px] leading-relaxed text-[#222] sm:text-[13.5px]">
          <p>
            This Business Authorization Certificate is issued by{" "}
            <strong>{COMPANY.legalName}</strong>, a limited liability company
            registered under the laws of {COMPANY.jurisdiction} (registration
            number {COMPANY.companyNo}), with its registered office at{" "}
            {COMPANY.addressLines.join(", ")}.
          </p>
          <p>
            {COMPANY.legalName} hereby authorizes the exclusive operation of the{" "}
            <strong>{BRAND.name}</strong> digital trading brand, including live
            market charts, seconds trading, crypto / FX / stocks / commodities
            contracts, client deposits and withdrawals, and 24/7 support, in
            accordance with the company’s published terms and risk disclosures.
          </p>
          <p>
            The authorized desk is responsible for maintaining platform
            integrity, fair presentation of trading conditions, and orderly
            handling of client funds and identity checks.
          </p>
          <p>
            This certificate is valid from <strong>{AUTH.validFrom}</strong> to{" "}
            <strong>{AUTH.validTo}</strong>. Renewal is subject to the continued
            good standing of {COMPANY.legalName}.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-10">
          <SignBlock
            stampId="left"
            stampRing="AUTHORIZED BY BINOMO · ST. VINCENT · "
            stampCenter="BINOMO"
            stampSub="EST. 2014"
            sign={AUTH.signLeft}
          />
          <SignBlock
            stampId="right"
            stampRing="DOLPHIN CORP LLC · OFFICIAL SEAL · "
            stampCenter="LLC"
            stampSub={COMPANY.companyNo}
            sign={AUTH.signRight}
          />
        </div>
      </div>
    </div>
  );
}

function SignBlock({ stampId, stampRing, stampCenter, stampSub, sign }) {
  return (
    <div className="relative min-h-[140px] pt-6">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 opacity-90">
        <OfficialStamp
          id={stampId}
          ring={stampRing}
          center={stampCenter}
          sub={stampSub}
        />
      </div>
      <div className="relative z-10 pt-10 text-center">
        <Cursive>{sign.script}</Cursive>
        <div className="mt-1 text-[10px] font-semibold sm:text-xs">{sign.name}</div>
        <div className="text-[10px] text-[#555] sm:text-xs">{sign.role}</div>
      </div>
    </div>
  );
}

export function CertificatePage({ onBack, onContact }) {
  const [zoom, setZoom] = useState(false);
  const address = COMPANY.addressLines.join(", ");

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <div className="px-4 py-10 text-center sm:py-14">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-white/20">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#ffc107]" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12.5l2.2 2.2L16.5 9" />
          </svg>
        </div>
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">
          {AUTH.heading}
        </div>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
          {BRAND.name}
        </h1>
        <p className="mt-3 text-sm text-white/60">
          Company number: {COMPANY.companyNo}
        </p>
        <p className="text-sm text-white/60">
          {address}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="block w-full text-left"
          title="Click to inspect official certificate"
        >
          <OfficialCertificateDocument />
        </button>
        <div className="bg-white pb-4 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
          Official certificate — click to verify
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#111] shadow-[0_16px_50px_rgba(0,0,0,0.3)] sm:p-8">
        <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">
          {AUTH.rightsTitle}
        </h2>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Valid {AUTH.validFrom} — {AUTH.validTo}
        </div>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-700">
          <p>
            {COMPANY.legalName} ({BRAND.name}) is the authorized operator of this
            trading terminal. Registration {COMPANY.companyNo}. Registered office:{" "}
            {address}.
          </p>
          <p>
            This record confirms exclusive authorization to offer Binomo seconds
            trading, live charts, deposits, withdrawals, Copy AI Bot, and client
            support under the Binomo brand, subject to published terms.
          </p>
          <p>
            Quality, identity checks, and fund-handling standards remain the
            responsibility of {COMPANY.legalName} throughout the validity period.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-8 text-sm">
          <div>
            <div className="font-bold">{AUTH.signLeft.name}</div>
            <div className="text-neutral-500">{AUTH.signLeft.role}</div>
          </div>
          <div>
            <div className="font-bold">{AUTH.signRight.name}</div>
            <div className="text-neutral-500">{AUTH.signRight.role}</div>
          </div>
        </div>
        <p className="mt-6 text-[11px] text-neutral-400">
          Official record of {COMPANY.legalName}. Certificate {AUTH.registrationNo}.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full bg-[#ffc107] px-6 py-2.5 text-sm font-extrabold text-black"
        >
          Back to home <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onContact}
          className="rounded-full border border-white/25 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
        >
          Contact support
        </button>
      </div>

      {zoom &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-8"
            onClick={() => setZoom(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto flex max-w-3xl justify-end pb-3">
              <button
                type="button"
                onClick={() => setZoom(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className="mx-auto max-w-3xl overflow-hidden rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <OfficialCertificateDocument />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export function CertificatePreview({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full overflow-hidden rounded-2xl border border-[#ffc107]/25 text-left shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition hover:border-[#ffc107]"
      title="Click to open official certificate"
    >
      <div className="origin-top scale-[0.98]">
        <OfficialCertificateDocument />
      </div>
      <div className="bg-[#0b0e11] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffc107]">
        Click to verify official certificate
      </div>
    </button>
  );
}
