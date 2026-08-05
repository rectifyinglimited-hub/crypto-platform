/**
 * Idempotent enrichment: ≥500 market_pair (crypto+forex) and ≥40 NFTs.
 * Safe to call on every catalog request — only inserts missing titles.
 */

import PlatformCatalog from "../models/PlatformCatalog.js";

const CRYPTO_BASES = [
  "BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "TRX", "DOT", "LINK",
  "MATIC", "POL", "AVAX", "SHIB", "LTC", "BCH", "ATOM", "UNI", "XLM", "NEAR",
  "APT", "ICP", "FIL", "HBAR", "ARB", "OP", "INJ", "SUI", "TON", "SEI",
  "TIA", "RENDER", "FET", "IMX", "STX", "AAVE", "MKR", "CRV", "LDO", "ENS",
  "APE", "CHZ", "SAND", "MANA", "AXS", "GALA", "PEPE", "WIF", "BONK", "FLOKI",
  "RUNE", "FTM", "EGLD", "THETA", "FLOW", "GRT", "ALGO", "VET", "EOS", "XTZ",
  "IOTA", "NEO", "KAVA", "ZIL", "BAT", "ENJ", "COMP", "SNX", "YFI", "1INCH",
  "SUSHI", "BAL", "ZRX", "QTUM", "ZEC", "DASH", "WAVES", "STORJ", "ANKR", "CELR",
  "ONE", "HOT", "DENT", "WIN", "JASMY", "GMT", "LRC", "SKL", "CTSI", "BAND",
  "KNC", "RSR", "OCEAN", "AGIX", "NMR", "API3", "AUDIO", "RLC", "CHR", "ALICE",
  "TLM", "SUPER", "HIGH", "PYR", "ILV", "YGG", "GHST", "CKB", "IOTX", "ONG",
  "ONT", "SC", "DGB", "RVN", "BEAM", "CFX", "ACH", "WOO", "HOOK", "MAGIC",
  "GMX", "RDNT", "EDU", "BLUR", "ARKM", "WLD", "PENDLE", "CYBER", "MEME", "ACE",
  "NFP", "XAI", "MANTA", "ALT", "JUP", "PYTH", "ENA", "TNSR", "SAGA", "TAO",
  "OMNI", "REZ", "NOT", "ZK", "ZRO", "BANANA", "DOGS", "EIGEN", "HMSTR", "CATI",
  "NEIRO", "ORDI", "PNUT", "ACT", "ORCA", "MOVE", "USUAL", "PENGU", "BIO", "AIXBT",
  "CGPT", "COOKIE", "KAIA", "LAYER", "BERA", "TRUMP", "ANIME", "GPS", "SHELL", "KAITO",
  "BMT", "EPIC", "FORM", "HEI", "NIL", "PARTI", "MAV", "BOME", "ETHFI", "METIS",
  "STRK", "DYM", "PIXEL", "PORTAL", "AEVO", "VANRY", "JTO", "TURBO", "POPCAT", "MEW",
  "GOAT", "MOODENG", "BRETT", "CAKE", "TWT", "SFP", "COTI", "REQ", "ARPA", "HIVE",
  "KSM", "DIA", "BEL", "OM", "POND", "PERP", "C98", "MASK", "ATA", "GTC",
  "QNT", "MINA", "RAY", "FARM", "MBOX", "FORTH", "PHA", "FIDA", "BICO", "FLUX",
  "FXS", "VOXEL", "CVX", "PEOPLE", "SPELL", "JOE", "GLMR", "LOKA", "SCRT", "ACA",
  "XNO", "ALPINE", "ASTR", "KDA", "BSW", "NEXO", "LUNC", "USTC", "LEVER", "STG",
  "GAS", "GLM", "IDEX", "RAD", "RARE", "CHESS", "ADX", "DAR", "MOVR", "CITY",
  "QI", "POWR", "AMP", "PLA", "ROSE", "DUSK", "AGLD", "AR", "CELO", "STPT",
  "ETC", "ICX", "IOST", "TFUEL", "COS", "KEY", "WAN", "FUN", "CVC", "OGN",
  "WRX", "LTO", "MBL", "WTC", "ZEN", "BLZ", "IRIS", "AERGO", "FRONT", "BNT",
  "RPL", "SSV", "LQTY", "PROM", "RADAR", "BIGTIME", "NTRN", "AI", "ACE", "XVS",
  "TRU", "UMA", "NMR", "MLN", "REN", "KEEP", "NU", "AMP", "GNO", "ANT",
  "REP", "KSM", "DOT", "GLMR", "MOVR", "ASTR", "CFG", "PHA", "LIT", "ACA",
  "SDN", "KAR", "BNC", "AIR", "INTR", "PARA", "NODL", "HKO", "CRU", "RING",
  "PCX", "CLV", "KILT", "BIT", "EQ", "GENS", "TEER", "PICA", "HDX", "BSX",
  "XRT", "SOL", "RAY", "SRM", "FIDA", "KIN", "MAPS", "OXY", "STEP", "COPE",
  "ROPE", "SAMO", "LIKE", "MEDIA", "TULIP", "SLRS", "ATLAS", "POLIS", "ORCA", "MNGO",
  "PORT", "SBR", "MER", "SLND", "JSOL", "mSOL", "stSOL", "scnSOL", "LARIX", "PRISM",
  "SUNNY", "TULIP", "MNDE", "HNT", "MOBILE", "IOT", "BONK", "WIF", "JTO", "JUP",
  "PYTH", "W", "TNSR", "RENDER", "HNT", "MOB", "ZEC", "DASH", "XMR", "KAS",
  "RBTC", "OKB", "HT", "LEO", "CRO", "OKT", "KCS", "GT", "NEXO", "CEL",
  "PAXG", "XAUT", "RPL", "FXS", "CVX", "LDO", "RBN", "DPI", "MVI", "BED",
];

const FOREX_PAIRS = [
  ["EUR", "USD"], ["GBP", "USD"], ["USD", "JPY"], ["USD", "CHF"], ["AUD", "USD"],
  ["USD", "CAD"], ["NZD", "USD"], ["EUR", "GBP"], ["EUR", "JPY"], ["GBP", "JPY"],
  ["AUD", "JPY"], ["EUR", "AUD"], ["EUR", "CAD"], ["EUR", "CHF"], ["GBP", "CHF"],
  ["AUD", "CAD"], ["AUD", "CHF"], ["AUD", "NZD"], ["CAD", "JPY"], ["CHF", "JPY"],
  ["NZD", "JPY"], ["GBP", "AUD"], ["GBP", "CAD"], ["GBP", "NZD"], ["EUR", "NZD"],
  ["USD", "SGD"], ["USD", "HKD"], ["USD", "CNH"], ["USD", "MXN"], ["USD", "ZAR"],
  ["USD", "TRY"], ["USD", "SEK"], ["USD", "NOK"], ["USD", "DKK"], ["USD", "PLN"],
  ["EUR", "SEK"], ["EUR", "NOK"], ["EUR", "PLN"], ["EUR", "TRY"], ["EUR", "ZAR"],
  ["GBP", "SEK"], ["GBP", "NOK"], ["GBP", "SGD"], ["AUD", "SGD"], ["NZD", "CAD"],
  ["NZD", "CHF"], ["CAD", "CHF"], ["SGD", "JPY"], ["HKD", "JPY"], ["XAU", "USD"],
  ["XAG", "USD"], ["WTI", "USD"], ["BRENT", "USD"], ["NAS100", "USD"], ["US30", "USD"],
  ["SPX500", "USD"], ["GER40", "EUR"], ["UK100", "GBP"], ["JPN225", "JPY"],
];

const NFT_COLLECTIONS = [
  "Void", "Neon", "Orbit", "Pulse", "Aether", "Quantum", "Nova", "Cipher",
  "Prism", "Flux", "Echo", "Mirage", "Zenith", "Horizon", "Arcane",
];
const NFT_RARITIES = ["Common", "Rare", "Epic", "SSR", "Star", "Legendary"];
const NFT_NAMES = [
  "Observer", "Wanderer", "Ape", "Fox", "Dragon", "Phoenix", "Samurai", "Pilot",
  "Oracle", "Guardian", "Specter", "Rogue", "Titan", "Sprite", "Cipher", "Mech",
  "Owl", "Wolf", "Crow", "Lion", "Serpent", "Knight", "Mage", "Dancer",
  "Captain", "Voyager", "Scholar", "Hunter", "Architect", "Nomad", "Rebel", "Sage",
  "Ember", "Frost", "Storm", "Shadow", "Lumen", "Voidling", "Spark", "Beacon",
];

function uniqueBases(list) {
  const seen = new Set();
  const out = [];
  for (const b of list) {
    const s = String(b).toUpperCase();
    if (!s || seen.has(s)) continue;
    if (["USDT", "USDC", "BUSD", "DAI"].includes(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function buildMarketPairSeed() {
  const bases = uniqueBases(CRYPTO_BASES);
  const rows = [];
  let sort = 1;
  for (const base of bases) {
    rows.push({
      kind: "market_pair",
      title: `${base}/USDT`,
      subtitle: "Crypto",
      price: 0,
      meta: { category: "Crypto", base, quote: "USDT" },
      enabled: true,
      featured: sort <= 12,
      sortOrder: sort++,
    });
  }
  for (const [base, quote] of FOREX_PAIRS) {
    rows.push({
      kind: "market_pair",
      title: `${base}/${quote}`,
      subtitle: "Forex",
      price: 0,
      meta: { category: "Forex", base, quote },
      enabled: true,
      featured: false,
      sortOrder: sort++,
    });
  }
  // Pad to ≥500 with synthetic crypto index pairs if needed
  let i = 1;
  while (rows.length < 500) {
    const base = `NX${String(i).padStart(3, "0")}`;
    rows.push({
      kind: "market_pair",
      title: `${base}/USDT`,
      subtitle: "Crypto",
      price: 0,
      meta: { category: "Crypto", base, quote: "USDT", synthetic: true },
      enabled: true,
      featured: false,
      sortOrder: sort++,
    });
    i += 1;
  }
  return rows;
}

export function buildNftSeed(count = 40) {
  const rows = [];
  for (let n = 1; n <= count; n++) {
    const name = NFT_NAMES[(n - 1) % NFT_NAMES.length];
    const collection = NFT_COLLECTIONS[(n - 1) % NFT_COLLECTIONS.length];
    const rarity = NFT_RARITIES[(n - 1) % NFT_RARITIES.length];
    const price = 49 + ((n * 37) % 900);
    rows.push({
      kind: "nft",
      title: `${collection} ${name} #${1000 + n}`,
      subtitle: `${rarity} · ${collection}`,
      price,
      meta: { rarity, collection, edition: n },
      enabled: true,
      featured: n <= 8,
      sortOrder: n,
    });
  }
  return rows;
}

/**
 * Insert missing market_pair / nft rows for a tenant (adminId null = global).
 */
export async function ensureCatalogEnrichment(adminId = null) {
  const filter = adminId ? { adminId } : { adminId: null };

  const marketCount = await PlatformCatalog.countDocuments({
    ...filter,
    kind: "market_pair",
  });
  if (marketCount < 500) {
    const desired = buildMarketPairSeed();
    const existing = await PlatformCatalog.find({
      ...filter,
      kind: "market_pair",
    })
      .select("title")
      .lean();
    const have = new Set(existing.map((e) => e.title));
    const toInsert = desired
      .filter((r) => !have.has(r.title))
      .map((r) => ({ ...r, adminId }));
    if (toInsert.length) {
      await PlatformCatalog.insertMany(toInsert, { ordered: false }).catch(
        () => {}
      );
    }
  }

  const nftCount = await PlatformCatalog.countDocuments({
    ...filter,
    kind: "nft",
  });
  if (nftCount < 40) {
    const desired = buildNftSeed(40);
    const existing = await PlatformCatalog.find({
      ...filter,
      kind: "nft",
    })
      .select("title")
      .lean();
    const have = new Set(existing.map((e) => e.title));
    const toInsert = desired
      .filter((r) => !have.has(r.title))
      .map((r) => ({ ...r, adminId }));
    if (toInsert.length) {
      await PlatformCatalog.insertMany(toInsert, { ordered: false }).catch(
        () => {}
      );
    }
  }

  // Globalize legacy C2C ads — remove PKR / local payment wording
  const c2cAds = await PlatformCatalog.find({
    ...filter,
    kind: "c2c_ad",
  });
  for (const doc of c2cAds) {
    const title = String(doc.title || "");
    const fiat = String(doc.meta?.fiat || "");
    const payment = String(doc.meta?.payment || "");
    const needsFix =
      /PKR/i.test(title) ||
      /PKR/i.test(fiat) ||
      /PKR/i.test(String(doc.subtitle || "")) ||
      /easypaisa|jazzcash|bank transfer/i.test(payment) ||
      fiat.toUpperCase() === "PKR";

    if (!needsFix) continue;

    const isSell = /sell/i.test(title) || doc.meta?.side === "buy";
    doc.title = isSell ? "USDT · Sell (USD)" : "USDT · Buy (USD)";
    doc.subtitle = "Global merchant desk";
    if (!doc.meta) doc.meta = {};
    doc.meta.fiat = "USD";
    doc.meta.payment = "Merchant Deposit";
    if (doc.meta.min == null) doc.meta.min = 50;
    if (doc.meta.max == null) doc.meta.max = 50000;
    doc.markModified("meta");
    await doc.save();
  }
}
