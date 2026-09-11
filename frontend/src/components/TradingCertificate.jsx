/**
 * Official equiti / Dolphin Corp LLC business authorization certificate.
 */
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, FileText, X } from "lucide-react";
import { BRAND, COMPANY, AUTHORIZATION as AUTH } from "../lib/brand.js";
import { LEGAL_DOCS, legalDocById } from "../lib/legalDocs.js";
import BrandLogo from "./BrandLogo.jsx";

export function openCertificate() {
  window.dispatchEvent(new CustomEvent("nexus:open-certificate"));
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
      <circle cx="70" cy="70" r="61" fill="none" stroke="#00C2B3" strokeWidth="3.2" />
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

export function OfficialCertificateDocument({
  title = AUTH.documentTitle,
  paragraphs,
  docId = "auth",
}) {
  const address = [COMPANY.legalName, ...COMPANY.addressLines, COMPANY.jurisdiction];
  const body = paragraphs || [
    `This Business Authorization Certificate is issued by ${COMPANY.legalName}, a limited liability company registered under the laws of ${COMPANY.jurisdiction} (registration number ${COMPANY.companyNo}), with its registered office at ${COMPANY.addressLines.join(", ")}.`,
    `${COMPANY.legalName} hereby authorizes the exclusive operation of the ${BRAND.name} digital trading brand, including live market charts, seconds trading, crypto / FX / stocks / commodities contracts, client deposits and withdrawals, and 24/7 support, in accordance with the company’s published terms and risk disclosures.`,
    "The authorized desk is responsible for maintaining platform integrity, fair presentation of trading conditions, and orderly handling of client funds and identity checks.",
    `This certificate is valid from ${AUTH.validFrom} to ${AUTH.validTo}. Renewal is subject to the continued good standing of ${COMPANY.legalName}.`,
  ];

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
            <BrandLogo variant="on-light" />
          </div>
          <div className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.18em] sm:text-sm">
            {title}
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
          {body.map((p) => (
            <p key={p.slice(0, 48)}>{p}</p>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-10">
          <SignBlock
            stampId={`${docId}-left`}
            stampRing="AUTHORIZED BY EQUITI · ST. VINCENT · "
            stampCenter="EQUITI"
            stampSub="EST. 2014"
            sign={AUTH.signLeft}
          />
          <SignBlock
            stampId={`${docId}-right`}
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

export function CertificatePreview({ onOpen, title, paragraphs, docId = "auth" }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full overflow-hidden rounded-2xl border border-[#00C2B3]/25 text-left shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition hover:border-[#00C2B3]"
      title="Click to verify official certificate"
    >
      <div className="origin-top scale-[0.98]">
        <OfficialCertificateDocument
          docId={docId}
          title={title}
          paragraphs={paragraphs}
        />
      </div>
      <div className="bg-[#0b0e11] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#00C2B3]">
        Open full document
      </div>
    </button>
  );
}

const DOC_GROUPS = [
  {
    title: "Corporate",
    ids: ["auth", "client-agreement", "terms", "privacy", "cookies", "website", "domain"],
  },
  {
    title: "Risk & trading",
    ids: ["risk", "execution", "conflicts", "feeds"],
  },
  {
    title: "Client operations",
    ids: ["kyc", "complaints", "notice", "fraud", "invite", "chat"],
  },
];

function docsInGroup(ids) {
  return ids
    .map((id) => LEGAL_DOCS.find((d) => d.id === id))
    .filter(Boolean);
}

export function CertificateGallery({
  onOpen,
  showIntro = true,
  initialId = "auth",
}) {
  const [tab, setTab] = useState(initialId);
  const [zoom, setZoom] = useState(false);
  const previewRef = useRef(null);
  const current = legalDocById(tab);
  const office = COMPANY.addressLines.join(", ");
  const index = Math.max(
    0,
    LEGAL_DOCS.findIndex((d) => d.id === current.id)
  );

  const selectDoc = (id) => {
    setTab(id);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      window.setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 40);
    }
  };

  const openPreview = () => {
    if (onOpen) onOpen(current);
    else setZoom(true);
  };

  return (
    <div>
      {showIntro ? (
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#00C2B3]">
            Legal archive
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
            Desk records
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            Select a document from the index. One record is shown at a time —
            the operator of this terminal is {COMPANY.legalName}.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-white/40">
            {COMPANY.legalName} · {COMPANY.companyNo}
            <br />
            {office} · {COMPANY.jurisdiction}
          </p>
        </div>
      ) : null}

      <div
        className={`${showIntro ? "mt-8" : ""} grid gap-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)] lg:items-start`}
      >
        <aside className="rounded-2xl border border-white/10 bg-white/[0.03] lg:sticky lg:top-24">
          <div className="border-b border-white/8 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
              Document index
            </div>
            <p className="mt-1 text-[11px] text-white/45">
              {LEGAL_DOCS.length} records · {index + 1} of {LEGAL_DOCS.length}
            </p>
          </div>
          <nav className="max-h-[min(52vh,420px)] overflow-y-auto p-2 lg:max-h-[min(70vh,640px)]">
            {DOC_GROUPS.map((group) => (
              <div key={group.title} className="mb-3 last:mb-0">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#00C2B3]/80">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {docsInGroup(group.ids).map((doc) => {
                    const active = doc.id === tab;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => selectDoc(doc.id)}
                        className={`flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] leading-snug transition ${
                          active
                            ? "bg-[#00C2B3]/15 text-white"
                            : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <FileText
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            active ? "text-[#00C2B3]" : "text-white/30"
                          }`}
                        />
                        <span className="font-medium">{doc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div ref={previewRef} className="min-w-0 scroll-mt-24">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
                Now viewing
              </p>
              <h3 className="mt-1 text-base font-semibold text-white sm:text-lg">
                {current.label}
              </h3>
            </div>
            <p className="text-[11px] text-white/40">Tap the paper to enlarge</p>
          </div>
          <CertificatePreview
            onOpen={openPreview}
            docId={current.id}
            title={current.title}
            paragraphs={current.paragraphs}
          />
        </div>
      </div>

      {zoom &&
        typeof document !== "undefined" &&
        createPortal(
          <CertificateZoom
            doc={current}
            onClose={() => setZoom(false)}
          />,
          document.body
        )}
    </div>
  );
}

function CertificateZoom({ doc, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-auto flex max-w-3xl justify-end pb-3">
        <button
          type="button"
          onClick={onClose}
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
        <OfficialCertificateDocument
          docId={`${doc.id}-zoom`}
          title={doc.title}
          paragraphs={doc.paragraphs}
        />
      </div>
    </div>
  );
}

export function CertificatePage({ onBack, onContact }) {
  const address = COMPANY.addressLines.join(", ");

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-10 pt-6 sm:pt-10">
      <div className="max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#00C2B3]">
          Legal archive
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Certificates &amp; desk records
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          Official documents of {COMPANY.legalName}. Pick one title from the
          index — the paper on the right is the live record, not a wall of
          copies.
        </p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-white/35">
              Operator
            </dt>
            <dd className="mt-1 font-semibold text-white">{COMPANY.legalName}</dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-white/35">
              Company number
            </dt>
            <dd className="mt-1 font-semibold text-white">{COMPANY.companyNo}</dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-white/35">
              Registered office
            </dt>
            <dd className="mt-1 text-white/80">
              {address}
              <span className="text-white/45"> · {COMPANY.jurisdiction}</span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8">
        <CertificateGallery showIntro={false} />
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white p-6 text-[#111] shadow-[0_16px_50px_rgba(0,0,0,0.3)] sm:p-8">
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
            This record confirms exclusive authorization to offer equiti seconds
            trading, live charts, deposits, withdrawals, Copy AI Bot, and client
            support under the equiti brand, subject to published terms.
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
          className="inline-flex items-center gap-2 rounded-full bg-[#00C2B3] px-6 py-2.5 text-sm font-extrabold text-black"
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
    </div>
  );
}
