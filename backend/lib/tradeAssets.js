/**
 * Tradable crypto bases (Binance USDT pairs) + stocks for Delivery / Seconds.
 * Keep in sync with frontend watchlist via GET /markets response.
 */

export const CRYPTO_ASSETS = [
  "BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "TRX", "DOT", "LINK",
  "MATIC", "POL", "AVAX", "SHIB", "LTC", "BCH", "ATOM", "UNI", "XLM", "NEAR",
  "APT", "ICP", "FIL", "HBAR", "ARB", "OP", "INJ", "SUI", "TON", "SEI",
  "TIA", "RENDER", "FET", "IMX", "STX", "AAVE", "MKR", "CRV", "LDO", "ENS",
  "APE", "CHZ", "SAND", "MANA", "AXS", "GALA", "PEPE", "WIF", "BONK", "FLOKI",
  "RUNE", "FTM", "EGLD", "THETA", "FLOW", "GRT", "ALGO", "VET", "EOS", "XTZ",
  "IOTA", "NEO", "KAVA", "ZIL", "BAT", "ENJ", "COMP", "SNX", "YFI", "1INCH",
  "SUSHI", "BAL", "ZRX", "QTUM", "ZEC", "DASH", "WAVES", "OMG", "STORJ", "ANKR",
  "CELR", "ONE", "HOT", "DENT", "WIN", "BTTC", "JASMY", "GMT", "GAL", "LRC",
  "SKL", "CTSI", "BAND", "KNC", "REN", "RSR", "OCEAN", "AGIX", "NMR", "API3",
  "AUDIO", "RLC", "CTK", "CHR", "ALICE", "TLM", "SUPER", "HIGH", "PYR", "ILV",
  "YGG", "GHST", "REEF", "CKB", "IOTX", "ONG", "ONT", "SC", "DGB", "RVN",
  "BEAM", "CFX", "ACH", "WOO", "HOOK", "MAGIC", "GMX", "RDNT", "ID", "EDU",
  "SUI", "BLUR", "ARKM", "WLD", "PENDLE", "ARK", "CYBER", "SEI", "MEME", "TIA",
  "ACE", "NFP", "AI", "XAI", "MANTA", "ALT", "JUP", "PYTH", "W", "ENA",
  "W", "TNSR", "SAGA", "TAO", "OMNI", "REZ", "BB", "NOT", "IO", "ZK",
  "LISTA", "ZRO", "G", "BANANA", "RENDER", "TON", "DOGS", "EIGEN", "HMSTR", "CATI",
  "NEIRO", "1MBABYDOGE", "1000SATS", "ORDI", "SATS", "RATS", "PNUT", "ACT", "THE", "ACX",
  "ORCA", "MOVE", "ME", "USUAL", "PENGU", "BIO", "AIXBT", "CGPT", "COOKIE", "KAIA",
  "LAYER", "BERA", "TRUMP", "ANIME", "VTHO", "GPS", "SHELL", "KAITO", "RED", "BMT",
  "EPIC", "FORM", "HEI", "NIL", "PARTI", "MAV", "BOME", "ETHFI", "METIS", "STRK",
  "DYM", "PIXEL", "PORTAL", "AEVO", "VANRY", "JTO", "BONK", "1000PEPE", "1000FLOKI", "TURBO",
  "MOG", "POPCAT", "MEW", "GOAT", "MOODENG", "HIPPO", "BRETT", "NEIROETH", "DOGE", "SHIB",
  "CAKE", "BAKE", "ALPHA", "TWT", "SFP", "CTK", "HARD", "FOR", "WNXM", "TRU",
  "LIT", "SXP", "COTI", "DATA", "REQ", "ARPA", "CTSI", "HIVE", "CHR", "MDT",
  "STMX", "KSM", "DIA", "BEL", "WING", "CREAM", "HEGIC", "PROM", "BADGER", "FIS",
  "OM", "POND", "DEGO", "ALICE", "LINA", "PERP", "RAMP", "QUICK", "C98", "MASK",
  "ATA", "GTC", "TORN", "KEEP", "MLN", "DNT", "CLV", "QNT", "FLOW", "TVK",
  "MINA", "RAY", "FARM", "QUICK", "MBOX", "FORTH", "BURGER", "SLP", "AUCTION", "PHA",
  "FIDA", "EPX", "BICO", "FLUX", "FXS", "VOXEL", "HIGH", "CVX", "PEOPLE", "SPELL",
  "JOE", "ACH", "IMX", "GLMR", "LOKA", "SCRT", "API3", "BTTC", "ACA", "ANC",
  "XNO", "WOO", "ALPINE", "T", "ASTR", "GMT", "KDA", "APE", "BSW", "BIFI",
  "MULTI", "STEEM", "NEXO", "REI", "LUNC", "USTC", "OP", "LEVER", "STG", "LDO",
  "CVP", "AMB", "BETH", "GMX", "POLYX", "APT", "OSMO", "HFT", "PHB", "HOOK",
  "MAGIC", "HIFI", "RPL", "PROS", "AGIX", "GNS", "SYN", "VIB", "SSV", "LQTY",
  "AMB", "USTC", "GAS", "GLM", "PROM", "QKC", "IDEX", "RAD", "RARE", "LAZIO",
  "CHESS", "ADX", "AUCTION", "DAR", "BNX", "RGT", "MOVR", "CITY", "ENS", "KP3R",
  "QI", "PORTO", "POWR", "VGX", "JASMY", "AMP", "PLA", "PYR", "ROSE", "DUSK",
  "ILV", "YGG", "FIDA", "AGLD", "RAD", "RARE", "LAZIO", "CHESS", "ADX", "AUCTION",
  "DAR", "BNX", "RGT", "MOVR", "CITY", "ENS", "KP3R", "QI", "PORTO", "POWR",
  "AR", "KLAY", "CELO", "ROSE", "IOTX", "ANKR", "COTI", "CHR", "MDT", "STPT",
  "DATA", "CTSI", "HIVE", "CHR", "ARDR", "KMD", "NULS", "XVG", "SC", "DGB",
  "RVN", "WAVES", "BTS", "LSK", "NAV", "VIB", "TRX", "XRP", "EOS", "IOTA",
  "XLM", "ONT", "QTUM", "ETC", "ICX", "NANO", "BTG", "HOT", "ZIL", "ZRX",
  "FET", "BAT", "ZEC", "IOST", "CELR", "ATOM", "TFUEL", "ONE", "FTM", "ALGO",
  "DOGE", "DUSK", "ANKR", "WIN", "COS", "COCOS", "TOMO", "PERL", "DENT", "MFT",
  "KEY", "DOCK", "WAN", "FUN", "CVC", "CHZ", "BAND", "BUSD", "BEAM", "XTZ",
  "RVN", "HBAR", "NKN", "STX", "KAVA", "ARPA", "IOTX", "RLC", "MCO", "CTXC",
  "BCH", "TROY", "VITE", "FTT", "EUR", "OGN", "DREP", "BULL", "BEAR", "ETHBULL",
  "ETHBEAR", "TCT", "WRX", "LTO", "MBL", "COTI", "AION", "MBL", "COTI", "STPT",
  "WTC", "DATA", "SOL", "CTSI", "HIVE", "CHR", "GXS", "ARDR", "LEND", "MDT",
  "STMX", "KNC", "REP", "LRC", "COMP", "SC", "ZEN", "SNX", "VTHO", "DGB",
  "GBP", "SXP", "MKR", "DCR", "STORJ", "MANA", "YFI", "BAL", "BLZ", "IRIS",
  "KAVA", "AERGO", "ATOM", "SNX", "GLM", "DAWN", "FRONT", "CVC", "BNT",
];

/** Deduplicate while preserving order */
export function uniqueAssets(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const a = String(raw || "")
      .toUpperCase()
      .trim();
    if (!a || seen.has(a)) continue;
    // Skip stablecoins / quote-like that aren't useful as trade bases
    if (["USDT", "USDC", "BUSD", "DAI", "TUSD", "FDUSD", "EUR", "GBP"].includes(a))
      continue;
    seen.add(a);
    out.push(a);
  }
  return out;
}

export const CRYPTO_ASSETS_UNIQUE = uniqueAssets(CRYPTO_ASSETS);

export const CRYPTO_QUOTES = ["USDT", "USDC"];

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

/** Compact forex codes (EURUSD) — Binance proxy uses base+USDT when available */
export const FOREX_ASSETS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
  "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "XAUUSD", "XAGUSD",
];

export function normalizeQuote(raw, assetType = "crypto") {
  const q = String(raw || "").toUpperCase();
  if (assetType === "crypto") return CRYPTO_QUOTES.includes(q) ? q : "USDT";
  if (assetType === "forex") return q || "USD";
  return "USD";
}

/** Binance spot symbol for a base + quote (BTC+USDT → BTCUSDT) */
export function toExchangeSymbol(asset, quote = "USDT") {
  const a = String(asset || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const q = String(quote || "USDT").toUpperCase();
  if (!a) return null;
  if (FOREX_ASSETS.includes(a)) {
    if (a === "XAUUSD") return "PAXGUSDT";
    if (a === "XAGUSD") return null;
    // EURUSD → EURUSDT. Do not map USDJPY → USDUSDT (~1).
    if (a.endsWith("USD") && a.length === 6 && !a.startsWith("USD")) {
      return `${a.slice(0, 3)}USDT`;
    }
    return null;
  }
  if (a.endsWith(q)) return a;
  return `${a}${q}`;
}

export function formatPairLabel(asset, quote = "USDT", assetType = "crypto") {
  const a = String(asset || "").toUpperCase();
  if (assetType === "forex" && a.length === 6) {
    return `${a.slice(0, 3)}/${a.slice(3)}`;
  }
  if (assetType === "stock") return `${a}/USD`;
  return `${a}/${normalizeQuote(quote, "crypto")}`;
}

export function resolveAssetType(asset) {
  const a = String(asset || "").toUpperCase();
  if (STOCK_ASSETS.includes(a)) return "stock";
  if (FOREX_ASSETS.includes(a)) return "forex";
  if (CRYPTO_ASSETS_UNIQUE.includes(a)) return "crypto";
  return null;
}

export const FALLBACK_PRICES = {
  BTC: 80000,
  ETH: 3500,
  SOL: 145,
  BNB: 580,
  XRP: 0.62,
  ADA: 0.45,
  DOGE: 0.12,
  DOT: 6.5,
  SHIB: 0.000018,
  LTC: 85,
  AVAX: 28,
  LINK: 14,
  UNI: 9,
  ATOM: 7,
  NEAR: 5,
  APT: 8,
  ARB: 0.85,
  OP: 1.6,
  SUI: 1.8,
  TON: 5.5,
  TRX: 0.14,
  ICP: 9,
  AAPL: 210,
  TSLA: 250,
  AMZN: 190,
  NVDA: 120,
  GOOGL: 175,
  MSFT: 420,
  META: 510,
  NFLX: 680,
  AMD: 155,
  INTC: 32,
  BA: 175,
  DIS: 95,
  KO: 62,
  PEP: 170,
  NKE: 78,
  JPM: 210,
  V: 280,
  MA: 460,
  BABA: 85,
  ORCL: 140,
  EURUSD: 1.085,
  GBPUSD: 1.27,
  USDJPY: 149.2,
  USDCHF: 0.88,
  AUDUSD: 0.66,
  USDCAD: 1.36,
  NZDUSD: 0.61,
  EURGBP: 0.85,
  EURJPY: 162,
  GBPJPY: 190,
  AUDJPY: 98,
  XAUUSD: 2350,
  XAGUSD: 28,
};

export function fallbackPrice(asset) {
  const sym = String(asset || "").toUpperCase();
  if (FALLBACK_PRICES[sym] != null) return FALLBACK_PRICES[sym];
  // Deterministic pseudo price so UI never shows 0
  let h = 0;
  for (const c of sym) h = (h * 33 + c.charCodeAt(0)) % 100000;
  return Number((0.05 + (h % 5000) / 100).toFixed(6));
}

/** Yahoo / FX last prices for stocks + forex pairs Binance does not list. */
let yahooQuoteCache = { at: 0, map: null, inflight: null };

function yahooQuerySymbol(asset, assetType) {
  const a = String(asset || "").toUpperCase();
  if (assetType === "stock") return a;
  if (assetType === "forex") {
    if (a === "XAUUSD") return "GC=F";
    if (a === "XAGUSD") return "SI=F";
    return `${a}=X`;
  }
  return null;
}

function sparkLastPrice(entry) {
  const closes = entry?.close;
  if (Array.isArray(closes)) {
    for (let i = closes.length - 1; i >= 0; i--) {
      const px = Number(closes[i]);
      if (Number.isFinite(px) && px > 0) return px;
    }
  }
  const px = Number(entry?.regularMarketPrice ?? entry?.chartPreviousClose);
  return Number.isFinite(px) && px > 0 ? px : 0;
}

export async function fetchYahooQuoteMap() {
  const now = Date.now();
  if (yahooQuoteCache.map && now - yahooQuoteCache.at < 20_000) {
    return yahooQuoteCache.map;
  }
  if (yahooQuoteCache.inflight) return yahooQuoteCache.inflight;

  const queries = [
    ...STOCK_ASSETS.map((a) => ({ asset: a, q: yahooQuerySymbol(a, "stock") })),
    ...FOREX_ASSETS.map((a) => ({ asset: a, q: yahooQuerySymbol(a, "forex") })),
  ].filter((row) => row.q);

  yahooQuoteCache.inflight = (async () => {
    const map = { ...(yahooQuoteCache.map || {}) };
    const chunkSize = 40;
    const chunks = [];
    for (let i = 0; i < queries.length; i += chunkSize) {
      chunks.push(queries.slice(i, i + chunkSize));
    }
    await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const symbols = chunk.map((c) => c.q).join(",");
          const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(symbols)}&range=1d&interval=1d`;
          const res = await fetch(url, {
            signal: AbortSignal.timeout(8000),
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Accept: "application/json",
            },
          });
          if (!res.ok) return;
          const data = await res.json();
          const byYahoo = new Map(chunk.map((c) => [c.q, c.asset]));
          const rows = Array.isArray(data?.spark?.result)
            ? data.spark.result
            : Object.values(data || {}).filter((row) => row && row.symbol);
          for (const row of rows) {
            const asset = byYahoo.get(String(row.symbol || ""));
            const px = sparkLastPrice(row);
            if (!asset || !(px > 0)) continue;
            map[asset] = px;
          }
        } catch {
          /* keep previous cache for this chunk */
        }
      })
    );
    yahooQuoteCache = { at: Date.now(), map, inflight: null };
    return map;
  })().catch(() => {
    yahooQuoteCache.inflight = null;
    return yahooQuoteCache.map || {};
  });

  return yahooQuoteCache.inflight;
}
