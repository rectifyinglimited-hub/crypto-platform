/**
 * Compact confirm dialog for admin destructive / global actions.
 */
export default function AdminConfirm({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#12171f] p-5 shadow-2xl"
      >
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        {body ? <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-white/10 px-3.5 py-2 text-sm text-slate-300 hover:bg-white/[0.04] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold disabled:opacity-50 ${
              danger
                ? "bg-rose-500 text-white hover:bg-rose-400"
                : "bg-[#00C2B3] text-slate-950 hover:brightness-110"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
