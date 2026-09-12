import { useEffect, useState } from "react";
import { COMPANY } from "./brand.js";
import { PlatformAPI } from "./api.js";

const CACHE_KEY = "equiti-desk-brand";

export const DEFAULT_DESK_NEWS = [
  {
    id: "n1",
    title: "Bitcoin holds key support as USDT rails stay busy",
    source: "Market desk",
    summary: "Spot desks watch the range while settlement windows stay open.",
    body: "Bitcoin is holding its recent support band while USDT rails stay active. Desk flow is two-way. No change to Equiti deposit or withdrawal windows.",
  },
  {
    id: "n2",
    title: "Ethereum volatility lifts Smart Spot copy books",
    source: "Spot desk",
    summary: "Intraday ranges widen; copy slots stay on the published open times.",
    body: "ETH ranges have widened versus the prior session. Smart Spot copy blocks still open at the times shown on your desk.",
  },
  {
    id: "n3",
    title: "USDT settlement windows unchanged",
    source: "Operations",
    summary: "TRC-20 deposits post after screenshot review.",
    body: "TRC-20 USDT remains the settlement rail. Send the on-chain receipt in Live Chat after you transfer.",
  },
  {
    id: "n4",
    title: "Gold-linked pairs keep an overnight range",
    source: "Macro",
    summary: "XAU crosses are range-bound into the London reopen.",
    body: "Gold-linked pairs are trading a contained overnight band. Liquidity usually improves at the London reopen.",
  },
  {
    id: "n5",
    title: "High-liquidity majors lead the session",
    source: "Insights",
    summary: "BTC, ETH, and XRP stay the most active books on the terminal.",
    body: "Majors continue to lead ticket count. Open Customer Service after you sign in if you need a receipt or payout status.",
  },
];

function fallbackBrand() {
  return {
    supportEmail: COMPANY.email,
    deskNews: DEFAULT_DESK_NEWS,
  };
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.supportEmail) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(brand) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(brand));
  } catch {
    /* ignore */
  }
}

export function useDeskBrand() {
  const [brand, setBrand] = useState(() => readCache() || fallbackBrand());

  useEffect(() => {
    let alive = true;
    PlatformAPI.publicBrand()
      .then((d) => {
        if (!alive) return;
        const next = {
          supportEmail: String(d?.supportEmail || COMPANY.email).trim() || COMPANY.email,
          deskNews:
            Array.isArray(d?.deskNews) && d.deskNews.length
              ? d.deskNews
              : DEFAULT_DESK_NEWS,
        };
        writeCache(next);
        setBrand(next);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return brand;
}
