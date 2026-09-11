/** Parse admin Gateway settings into deposit networks (crypto + bank). */

export const MIN_USDT_DEPOSIT = 10;

function filledRails(gateway) {
  return (Array.isArray(gateway?.rails) ? gateway.rails : []).filter((r) =>
    String(r?.value || "").trim()
  );
}

function matchRail(rails, re) {
  return rails.find((r) => re.test(`${r.id || ""} ${r.label || ""}`));
}

export function parseDepositNetworks(gateway) {
  if (!gateway) return [];
  const rails = filledRails(gateway);
  const networks = [];

  const trc = String(
    gateway.usdtTrc20Address || matchRail(rails, /trc\s*-?20/i)?.value || ""
  ).trim();
  const erc = String(
    gateway.usdtErc20Address || matchRail(rails, /erc\s*-?20/i)?.value || ""
  ).trim();
  const bep = String(matchRail(rails, /bep\s*-?20|\bbsc\b/i)?.value || "").trim();

  if (trc) {
    networks.push({
      id: "TRC20",
      label: "TRC20",
      subtitle: "Tron · USDT",
      kind: "crypto",
      address: trc,
      warning:
        "Send only USDT on Tron (TRC-20). Any other token or network is lost.",
    });
  }
  if (erc) {
    networks.push({
      id: "ERC20",
      label: "ERC20",
      subtitle: "Ethereum · USDT",
      kind: "crypto",
      address: erc,
      warning:
        "Send only USDT on Ethereum (ERC-20). Wrong-network transfers cannot be recovered.",
    });
  }
  if (bep) {
    networks.push({
      id: "BEP20",
      label: "BEP20",
      subtitle: "BNB Smart Chain · USDT",
      kind: "crypto",
      address: bep,
      warning: "Send only USDT on BNB Smart Chain (BEP-20).",
    });
  }

  const cryptoHit = (r) => /usdt|trc|erc|bep|bsc/i.test(`${r.id} ${r.label}`);
  const bankRails = rails.filter((r) => !cryptoHit(r));
  if (bankRails.length) {
    networks.push({
      id: "BANK",
      label: "Bank",
      subtitle: "Wire / local transfer",
      kind: "bank",
      address: "",
      rails: bankRails,
      warning:
        "Use these account details exactly. Put your username in the payment reference.",
    });
  }
  return networks;
}

export function qrImageUrl(data) {
  const v = String(data || "").trim();
  if (!v) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(v)}`;
}

export function txStatusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "completed") {
    return "bg-emerald-500/15 text-emerald-300";
  }
  if (s === "rejected" || s === "declined") {
    return "bg-rose-500/15 text-rose-300";
  }
  return "bg-amber-500/15 text-amber-200";
}

export function txStatusLabel(status) {
  const s = String(status || "pending").toLowerCase();
  if (s === "approved" || s === "completed") return "Credited";
  if (s === "rejected" || s === "declined") return "Rejected";
  return "In review";
}
