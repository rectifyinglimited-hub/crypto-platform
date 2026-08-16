/**
 * Withdraw desk — crypto wallet or verified bank card, held pending admin.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowUpFromLine, Loader2, Send, MessageCircle } from "lucide-react";
import { PlatformAPI, WalletAPI } from "../lib/api.js";

function fmt(n, d = 4) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: d });
}

function NetworkLogo({ network }) {
  const n = String(network || "TRC20").toUpperCase();
  const cls =
    n === "ERC20"
      ? "from-indigo-500 to-blue-400"
      : n === "BEP20"
        ? "from-amber-400 to-yellow-500"
        : "from-red-500 to-orange-400";
  const letter = n === "ERC20" ? "E" : n === "BEP20" ? "B" : "T";
  return (
    <div
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${cls} text-[11px] font-black text-white shadow-md`}
      title={n}
    >
      {letter}
    </div>
  );
}

export default function WithdrawSection({
  wallet,
  user,
  savedAddresses = [],
  bankCards = [],
  toast,
  onWalletUpdate,
  onOpenLiveChat,
}) {
  const [saved, setSaved] = useState(savedAddresses);
  const [cards, setCards] = useState(bankCards);
  const [walletBal, setWalletBal] = useState(wallet || {});

  useEffect(() => {
    setSaved(savedAddresses);
    setCards(bankCards);
    if (wallet) setWalletBal(wallet);
  }, [savedAddresses, bankCards, wallet]);

  useEffect(() => {
    if ((savedAddresses || []).length || (bankCards || []).length || wallet) return;
    PlatformAPI.assets()
      .then((r) => {
        setSaved(r.withdrawAddresses || []);
        setCards(r.bankCards || []);
        if (r.wallet) setWalletBal(r.wallet);
      })
      .catch(() => {});
  }, [savedAddresses, bankCards, wallet]);

  useEffect(() => {
    onOpenLiveChat?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [method, setMethod] = useState("crypto");
  const [symbol, setSymbol] = useState("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [address, setAddress] = useState("");
  const [walletId, setWalletId] = useState("");
  const [cardId, setCardId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const approvedWallets = useMemo(
    () => (saved || []).filter((a) => (a.status || "pending") === "approved"),
    [saved]
  );
  const approvedCards = useMemo(
    () => (cards || []).filter((c) => (c.status || "pending") === "approved"),
    [cards]
  );

  const available = Number(walletBal?.[symbol] || wallet?.[symbol] || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (submitting || !amt || amt <= 0) return;

    let dest = address.trim();
    let destNetwork = network;
    let cardName = "";
    if (method === "crypto") {
      if (walletId) {
        const picked = approvedWallets.find(
          (w) => String(w._id) === String(walletId)
        );
        if (picked) {
          dest = picked.address;
          destNetwork = picked.network || network;
        }
      }
      if (!dest) {
        toast?.("error", "Enter or select a wallet address.");
        return;
      }
    } else {
      const picked = approvedCards.find((c) => String(c._id) === String(cardId));
      if (!picked) {
        toast?.("error", "Select an approved bank card. Admin must verify it first.");
        return;
      }
      dest = picked.cardNumber || picked.accountNumber;
      destNetwork = "BANK";
      cardName = picked.holderName || picked.accountName || "";
    }

    setSubmitting(true);
    try {
      const res = await WalletAPI.withdrawRequest({
        symbol,
        amount: amt,
        address: dest,
        network: destNetwork,
        method,
        cardName,
      });
      toast?.("success", res.message || "Withdrawal pending admin approval.");
      if (res.wallet) {
        setWalletBal(res.wallet);
        onWalletUpdate?.({ wallet: res.wallet });
      }
      setAmount("");
    } catch (err) {
      toast?.("error", err?.message || "Withdrawal failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <ArrowUpFromLine className="h-4 w-4 text-indigo-300" /> Withdraw
      </h3>
      <p className="mb-4 text-[11px] text-slate-500">
        Funds are held immediately and released only after admin approval. Use a
        verified wallet address or bank card from Assets.
      </p>

      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-[11px] text-rose-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
          <span>
            Submit the form, then send amount, network, and destination in Live Chat so we can review the payout.
          </span>
        </div>
        <button
          type="button"
          onClick={() => onOpenLiveChat?.()}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-rose-400 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-950"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Open Live Chat
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {[
          { id: "crypto", label: "Crypto wallet" },
          { id: "bank", label: "Bank card" },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethod(m.id)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              method === m.id
                ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-200"
                : "border-white/10 text-slate-400"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Asset
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none"
            >
              {["USDT", "BTC", "ETH", "SOL"].map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {s}
                </option>
              ))}
            </select>
          </div>
          {method === "crypto" ? (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Network
              </label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none"
              >
                {["TRC20", "ERC20", "BEP20"].map((n) => (
                  <option key={n} value={n} className="bg-slate-900">
                    {n}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Available
              </label>
              <div className="flex h-[38px] items-center rounded-xl border border-white/5 bg-white/[0.02] px-3 text-sm tabular-nums text-white">
                {fmt(available, 4)} {symbol}
              </div>
            </div>
          )}
        </div>

        {method === "crypto" && (
          <>
            {approvedWallets.length > 0 && (
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Saved wallet
                </label>
                <select
                  value={walletId}
                  onChange={(e) => {
                    setWalletId(e.target.value);
                    const picked = approvedWallets.find(
                      (w) => String(w._id) === e.target.value
                    );
                    if (picked) {
                      setAddress(picked.address);
                      if (picked.network) setNetwork(picked.network);
                    }
                  }}
                  className="w-full appearance-none rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  <option value="" className="bg-slate-900">
                    Select saved wallet or paste below
                  </option>
                  {approvedWallets.map((w) => (
                    <option key={w._id} value={w._id} className="bg-slate-900">
                      {w.name || w.label} · {w.network}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                <NetworkLogo network={network} />
                Wallet address
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Paste destination wallet address"
                className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm font-mono text-slate-100 outline-none placeholder:text-slate-600"
              />
            </div>
          </>
        )}

        {method === "bank" && (
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Bank card
            </label>
            {approvedCards.length === 0 ? (
              <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                No verified bank card yet. Add one in Assets → Payment and wait
                for admin approval.
              </p>
            ) : (
              <select
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none"
              >
                <option value="" className="bg-slate-900">
                  Select card
                </option>
                {approvedCards.map((c) => (
                  <option key={c._id} value={c._id} className="bg-slate-900">
                    {c.holderName || c.accountName} · ****
                    {String(c.cardNumber || c.accountNumber || "").slice(-4)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            <span>Amount</span>
            <span>
              Available: {fmt(available, 4)} {symbol}
            </span>
          </label>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !parseFloat(amount)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Submit Withdrawal Request
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export { NetworkLogo };
