export const CRYPTO_ASSETS = [
  "BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "TRX", "DOT", "LINK",
  "MATIC", "POL", "AVAX", "SHIB", "LTC", "BCH", "ATOM", "UNI", "XLM", "NEAR",
  "APT", "ICP", "FIL", "HBAR", "ARB", "OP", "INJ", "SUI", "TON", "SEI",
  "TIA", "RENDER", "FET", "IMX", "STX", "AAVE", "MKR", "CRV", "LDO", "ENS",
  "APE", "CHZ", "SAND", "MANA", "AXS", "GALA", "PEPE", "WIF", "BONK", "FLOKI",
  "RUNE", "FTM", "EGLD", "THETA", "FLOW", "GRT", "ALGO", "VET", "EOS", "XTZ",
  "IOTA", "NEO", "KAVA", "ZIL", "BAT", "ENJ", "COMP", "SNX", "YFI", "1INCH",
  "SUSHI", "PEOPLE", "ORDI", "WLD", "JUP", "ENA", "TAO", "PENDLE", "ONDO", "TRUMP",
  "PENGU", "CAKE", "TWT", "MASK", "QNT", "MINA", "RAY", "STRK", "ARKM", "BLUR",
];

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
  "AAPL", "MSFT", "NVDA", "GOOGL", "GOOG", "AMZN", "META", "TSLA", "AVGO", "JPM",
  "LLY", "V", "UNH", "XOM", "MA", "COST", "JNJ", "WMT", "PG", "HD",
  "ORCL", "NFLX", "ABBV", "CVX", "BAC", "KO", "MRK", "CRM", "AMD", "PEP",
  "TMO", "CSCO", "ADBE", "LIN", "ACN", "MCD", "WFC", "IBM", "GE", "CAT",
  "NOW", "INTU", "DIS", "QCOM", "TXN", "AMAT", "UBER", "AMGN", "PFE", "NKE",
  "LOW", "BA", "SBUX", "GS", "INTC", "HON", "BKNG", "RTX", "SPGI", "ISRG",
  "DE", "BLK", "SYK", "MDT", "TJX", "GILD", "ADP", "LMT", "C", "ADI",
  "VRTX", "ETN", "REGN", "SCHW", "CB", "PANW", "MU", "LRCX", "KLAC", "SNPS",
  "CDNS", "CRWD", "SHOP", "SNOW", "PLTR", "COIN", "HOOD", "SQ", "PYPL", "ABNB",
  "RIVN", "LCID", "NIO", "BABA", "JD", "PDD", "BIDU", "TSM", "ASML", "SAP",
  "SONY", "TM", "NVO", "UL", "BP", "SHEL", "BHP", "RIO", "VALE", "NEM",
  "FCX", "F", "GM", "RACE", "SPOT", "ROKU", "SNAP", "PINS", "ZM", "NET",
  "DDOG", "OKTA", "ZS", "GME", "AMC", "DKNG", "MSTR", "APP", "ARM", "SMCI",
];

const NAMES = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BNB: "BNB",
  SOL: "Solana",
  XRP: "XRP",
  DOGE: "Dogecoin",
  ADA: "Cardano",
  SHIB: "Shiba Inu",
  PEPE: "Pepe",
  LINK: "Chainlink",
  AVAX: "Avalanche",
  DOT: "Polkadot",
  TRX: "TRON",
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
  GOOG: "Alphabet Class C",
  MSFT: "Microsoft",
  META: "Meta",
  NFLX: "Netflix",
  AMD: "AMD",
  INTC: "Intel",
  BA: "Boeing",
  DIS: "Disney",
  KO: "Coca-Cola",
  PEP: "PepsiCo",
  NKE: "Nike",
  JPM: "JPMorgan",
  V: "Visa",
  MA: "Mastercard",
  BABA: "Alibaba",
  ORCL: "Oracle",
  AVGO: "Broadcom",
  LLY: "Eli Lilly",
  UNH: "UnitedHealth",
  XOM: "ExxonMobil",
  COST: "Costco",
  JNJ: "Johnson & Johnson",
  WMT: "Walmart",
  PG: "Procter & Gamble",
  HD: "Home Depot",
  ABBV: "AbbVie",
  CVX: "Chevron",
  BAC: "Bank of America",
  MRK: "Merck",
  CRM: "Salesforce",
  TMO: "Thermo Fisher",
  CSCO: "Cisco",
  ADBE: "Adobe",
  MCD: "McDonald's",
  IBM: "IBM",
  GE: "GE",
  CAT: "Caterpillar",
  NOW: "ServiceNow",
  INTU: "Intuit",
  QCOM: "Qualcomm",
  TXN: "Texas Instruments",
  UBER: "Uber",
  PFE: "Pfizer",
  GS: "Goldman Sachs",
  PANW: "Palo Alto",
  CRWD: "CrowdStrike",
  SHOP: "Shopify",
  SNOW: "Snowflake",
  PLTR: "Palantir",
  COIN: "Coinbase",
  HOOD: "Robinhood",
  PYPL: "PayPal",
  ABNB: "Airbnb",
  TSM: "TSMC",
  ASML: "ASML",
  SAP: "SAP",
  SONY: "Sony",
  TM: "Toyota",
  SPOT: "Spotify",
  GME: "GameStop",
  MSTR: "MicroStrategy",
  SMCI: "Super Micro",
  ARM: "Arm",
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
  if (s === "smart_copy") return "Smart Spot Trade";
  if (s === "ai_future") return "AI Futures Strategy";
  if (s === "seconds_trade") return "Trade";
  if (s === "deposit") return "Deposit";
  if (s === "withdrawal") return "Withdraw";
  if (s === "referral") return "Invite & Earn";
  if (s === "admin_credit") return "Admin credit";
  const n = String(note || "");
  if (/smart copy|smart spot/i.test(n)) return "Smart Spot Trade";
  if (/ai bot/i.test(n)) return "AI Futures Strategy";
  if (/seconds/i.test(n)) return "Trade";
  if (kind === "deposit") return "Deposit";
  if (kind === "withdrawal") return "Withdraw";
  if (kind === "referral") return "Invite & Earn";
  return kind ? String(kind).replace(/_/g, " ") : "Balance";
}

/** History menu bucket: trade | smart_copy | ai_future | other */
export function historyKind(source, kind, note = "") {
  const label = sourceLabel(source, kind, note);
  if (label === "Smart Spot Trade") return "smart_copy";
  if (label === "AI Futures Strategy") return "ai_future";
  if (label === "Trade") return "seconds_trade";
  return "other";
}
