/** Market lists + labels for Smart Copy Trade coin pickers. */

export const FOREX_ASSETS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCHF",
  "AUDUSD",
  "USDCAD",
  "NZDUSD",
  "EURGBP",
  "EURJPY",
  "GBPJPY",
  "AUDJPY",
  "XAUUSD",
  "XAGUSD",
];

export const STOCK_ASSETS = [
  "AAPL",
  "TSLA",
  "AMZN",
  "NVDA",
  "GOOGL",
  "MSFT",
  "META",
  "NFLX",
  "AMD",
  "INTC",
  "BA",
  "DIS",
  "KO",
  "PEP",
  "NKE",
  "JPM",
  "V",
  "MA",
  "BABA",
  "ORCL",
];

const NAMES = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BNB: "BNB",
  SOL: "Solana",
  XRP: "XRP",
  DOGE: "Dogecoin",
  ADA: "Cardano",
  XAUUSD: "Gold",
  XAGUSD: "Silver",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  USDCHF: "USD/CHF",
  AUDUSD: "AUD/USD",
  USDCAD: "USD/CAD",
  NZDUSD: "NZD/USD",
  EURGBP: "EUR/GBP",
  EURJPY: "EUR/JPY",
  GBPJPY: "GBP/JPY",
  AUDJPY: "AUD/JPY",
  AAPL: "Apple",
  TSLA: "Tesla",
  AMZN: "Amazon",
  NVDA: "NVIDIA",
  GOOGL: "Alphabet",
  MSFT: "Microsoft",
  META: "Meta",
};

const SEEDS = {
  BTC: 68000,
  ETH: 3500,
  XAUUSD: 2350,
  EURUSD: 1.085,
  AAPL: 210,
  TSLA: 250,
};

export function pairLabel(asset, type = "crypto") {
  const a = String(asset || "").toUpperCase();
  if (type === "forex" && a.length >= 6) {
    if (a === "XAUUSD") return "XAU/USD";
    if (a === "XAGUSD") return "XAG/USD";
    return `${a.slice(0, 3)}/${a.slice(3)}`;
  }
  if (type === "stock") return `${a}/USD`;
  return `${a}/USDT`;
}

export function displayName(asset, type = "crypto") {
  const a = String(asset || "").toUpperCase();
  return NAMES[a] || pairLabel(a, type);
}

export function chartSymbol(asset, type = "crypto") {
  const a = String(asset || "").toUpperCase();
  if (type === "stock") return null;
  if (type === "forex") {
    if (a === "XAUUSD") return "PAXGUSDT";
    if (a === "XAGUSD") return null;
    if (a.endsWith("USD") && a.length === 6) return `${a.slice(0, 3)}USDT`;
    return null;
  }
  if (!a) return null;
  return `${a}USDT`;
}

export function seedPrice(asset) {
  const a = String(asset || "").toUpperCase();
  if (SEEDS[a] != null) return SEEDS[a];
  let h = 0;
  for (const c of a) h = (h * 33 + c.charCodeAt(0)) % 100000;
  return Number((0.05 + (h % 5000) / 100).toFixed(6));
}

export function sourceLabel(source, kind, note = "") {
  const s = String(source || "").toLowerCase();
  if (s === "smart_copy") return "Smart Copy Trade";
  if (s === "ai_future") return "AI Future Strategy";
  if (s === "seconds_trade") return "Trade";
  if (s === "deposit") return "Deposit";
  if (s === "withdrawal") return "Withdraw";
  if (s === "referral") return "Invite & Earn";
  if (s === "admin_credit") return "Admin credit";
  const n = String(note || "");
  if (/smart copy/i.test(n)) return "Smart Copy Trade";
  if (/ai bot/i.test(n)) return "AI Future Strategy";
  if (/seconds/i.test(n)) return "Trade";
  if (kind === "deposit") return "Deposit";
  if (kind === "withdrawal") return "Withdraw";
  if (kind === "referral") return "Invite & Earn";
  return kind ? String(kind).replace(/_/g, " ") : "Balance";
}
