/** Shared brand, socials, and media for the public + logged-in shells. */

export const BRAND = {
  name: "Binomo",
};

export const COMPANY = {
  legalName: "Dolphin Corp LLC",
  companyNo: "915 LLC 2021",
  email: "support@binomo.com",
  addressLines: [
    "Euro House, Richmond Hill Road",
    "Kingstown, St. Vincent and Grenadines",
  ],
  copyrightFrom: 2014,
  copyrightTo: 2026,
};

export const CERTIFICATES = [
  {
    id: "ifc-a",
    title: "Certificate of Membership",
    issuer: "The Financial Commission",
    subtitle: "Category “A” Member",
    holder: "Binomo",
    number: "IFC-A-BNM-2018-0516",
    registered: "20 May 2018",
    validThrough: "2026",
    status: "Active · Verified",
    body: "This certifies that the trading brand Binomo, operated by Dolphin Corp LLC, is an active Category A member of The Financial Commission — an independent dispute-resolution body for online brokerage and CFD trading.",
    extra: "Compensation fund: up to €20,000 per complaint",
  },
  {
    id: "vmt",
    title: "Certificate of Trade Execution Quality",
    issuer: "Independent Trade Audit",
    subtitle: "Execution · Transparency · Fair pricing",
    holder: "Binomo",
    number: "TEQ-BNM-5000-2026",
    registered: "1 January 2026",
    validThrough: "31 December 2026",
    status: "Active · Verified",
    body: "This certifies that Binomo’s seconds-trading desk meets published standards for trade execution quality, timestamped fills, and client-report transparency on FX, crypto, stocks, and commodities.",
    extra: "Audit sample: 5,000 executed trades",
  },
];

export const SOCIAL_LINKS = [
  {
    id: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=100090811043321",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/binomo/",
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://www.youtube.com/channel/UCwkD9jHgRANkwNWMKfZQm0w",
  },
];

/** Bitcoin + chart loop for the main hero. */
export const HERO_VIDEO = "/bg/hero-crypto.mp4";
export const HERO_POSTER = "/bg/hero-exchange.jpg";
/** Neon crypto-graphics loop for VIP / about / splash. */
export const CRYPTO_VIDEO = "/bg/crypto-motion.mp4";
export const CRYPTO_POSTER = "/bg/charts-desk.jpg";
