import { BRAND, COMPANY, AUTHORIZATION as AUTH } from "./brand.js";

const office = COMPANY.addressLines.join(", ");
const operator = `${COMPANY.legalName} (${BRAND.name})`;

function p(...parts) {
  return parts.join(" ");
}

/** Equiti Brokerage (Seychelles) Limited legal archive — FSA + LEI record. */
export const LEGAL_DOCS = [
  {
    id: "auth",
    label: "Business Authorization Certificate",
    title: AUTH.documentTitle,
  },
  {
    id: "entity",
    label: "Legal Entity Record (LEI)",
    title: "LEGAL ENTITY IDENTIFIER RECORD",
    paragraphs: [
      p(
        `${COMPANY.legalName} is the legal operator of this ${BRAND.name} terminal. Legal name language: English. Entity status: ${COMPANY.entityStatus}. Entity created ${COMPANY.entityCreated}.`
      ),
      p(
        `LEI: ${COMPANY.lei}. Legal form: ${COMPANY.legalForm}. Legal jurisdiction country: ${COMPANY.jurisdiction} (${COMPANY.jurisdictionCode}).`
      ),
      p(
        `Registration authority: ${COMPANY.regulator} (${COMPANY.regulatorId}). Registration authority entity ID: ${COMPANY.companyNo}.`
      ),
      p(
        `Legal address and headquarters: ${office}. This record is presented for desk transparency and matches the company’s published legal-entity identifiers.`
      ),
    ],
  },
  {
    id: "client-agreement",
    label: "Client Agreement",
    title: "CLIENT AGREEMENT",
    paragraphs: [
      p(
        `This Client Agreement is issued by ${COMPANY.legalName}, a ${COMPANY.legalForm} registered under the laws of ${COMPANY.jurisdiction} (FSA entity ID ${COMPANY.companyNo}, LEI ${COMPANY.lei}), with its registered office at ${office}.`
      ),
      p(
        `By opening an invite-only account on the ${BRAND.name} terminal you agree to trade with ${COMPANY.legalName} as the authorized operator of the brand, including live charts, seconds trading, Smart Spot Trade, AI Futures Strategy, deposits, and withdrawals.`
      ),
      p(
        "You confirm that you are acting on your own behalf, that you will complete identity checks when requested, and that you accept the published terms, risk disclosure, and desk rules before placing any order."
      ),
      p(
        `Valid ${AUTH.validFrom} to ${AUTH.validTo}. The registered office and legal name of the operator remain ${COMPANY.legalName}, ${office}.`
      ),
    ],
  },
  {
    id: "terms",
    label: "Client Terms & Conditions",
    title: "CLIENT TERMS & CONDITIONS",
    paragraphs: [
      p(
        `${COMPANY.legalName} operates the ${BRAND.name} desk from ${office}, ${COMPANY.jurisdiction}. These terms apply to every registered user of the terminal.`
      ),
      p(
        "Access is invite-gated. Deposits require a receipt in Live Chat. Withdrawals are reviewed by the desk after identity checks. Locked AI Futures principal stays on the contract until the stated recover path ends."
      ),
      p(
        "The desk may pause trading, refuse an order, or request extra documents where funds or identity cannot be verified. Published product rules on AI Futures Strategy and Smart Spot Trade form part of these terms."
      ),
      p(
        `Questions go to ${COMPANY.email} or 24/7 Live Chat. The operator of record is ${COMPANY.legalName}, FSA entity ID ${COMPANY.companyNo}, LEI ${COMPANY.lei}.`
      ),
    ],
  },
  {
    id: "risk",
    label: "Risk Warning Disclosure",
    title: "RISK WARNING DISCLOSURE",
    paragraphs: [
      p(
        `${operator} provides leveraged and short-duration trading products. These are high-risk and may not be suitable for every client. You can lose the funds you place on the desk.`
      ),
      p(
        "Seconds trades, Smart Spot copies, and AI Futures locks can move quickly. Past results on the terminal are not a guarantee of future outcomes. You should only use money you can afford to put at risk."
      ),
      p(
        "This notice must be read with the Client Terms and Client Agreement. If you do not understand the products, do not trade. Seek independent advice if you need it."
      ),
      p(
        `Issued by ${COMPANY.legalName}, ${office}. Certificate ${AUTH.registrationNo}. Valid ${AUTH.validFrom} — ${AUTH.validTo}.`
      ),
    ],
  },
  {
    id: "privacy",
    label: "Privacy Notice",
    title: "PRIVACY NOTICE",
    paragraphs: [
      p(
        `${COMPANY.legalName} collects account, identity, and support information so the ${BRAND.name} desk can register invite-only users, review KYC, process deposits and withdrawals, and reply in Live Chat.`
      ),
      p(
        "Data stays with the authorized operator and the staff who review your file. We do not sell client identity packs. You may ask support to update or correct your profile details."
      ),
      p(
        `Contact for privacy questions: ${COMPANY.email}. Controller: ${COMPANY.legalName}, ${office}, ${COMPANY.jurisdiction}.`
      ),
    ],
  },
  {
    id: "execution",
    label: "Order Execution Policy",
    title: "ORDER EXECUTION POLICY",
    paragraphs: [
      p(
        `Orders on the ${BRAND.name} terminal are executed by ${COMPANY.legalName} on the desk as presented in the live charts and product screens.`
      ),
      p(
        "Seconds trades settle at the timer on the quoted pair. Smart Spot Ready-to-Copy follows the block rules shown on that desk. AI Futures Strategy locks principal for the selected duration under the published recover path."
      ),
      p(
        "Prices on screen are for execution on this platform. The desk may reject an order if trading is paused, the wallet cannot cover the stake, or identity review is incomplete."
      ),
      p(`Operator: ${COMPANY.legalName}, ${office}.`),
    ],
  },
  {
    id: "conflicts",
    label: "Conflicts of Interest Policy",
    title: "CONFLICTS OF INTEREST POLICY",
    paragraphs: [
      p(
        `${COMPANY.legalName} runs the ${BRAND.name} brand as a single authorized operator. The desk reviews deposits, withdrawals, KYC, and support in one control room.`
      ),
      p(
        "Staff must not trade against a named client file or leak Live Chat receipts. Product rules and wallet credits are applied as configured by the administrator for that account."
      ),
      p(
        `If a conflict cannot be managed, the desk will disclose it to the client in Live Chat. Registered office: ${office}.`
      ),
    ],
  },
  {
    id: "complaints",
    label: "Complaints Handling Policy",
    title: "COMPLAINTS HANDLING POLICY",
    paragraphs: [
      p(
        `Complaints about the ${BRAND.name} terminal are handled by ${COMPANY.legalName} through 24/7 Live Chat or ${COMPANY.email}.`
      ),
      p(
        "Send your username, the date of the event, and any deposit or withdrawal receipt. The desk will review the thread and reply in the same channel."
      ),
      p(
        `Postal address for written complaints: ${COMPANY.legalName}, ${office}, ${COMPANY.jurisdiction}.`
      ),
    ],
  },
  {
    id: "cookies",
    label: "Cookies Policy",
    title: "COOKIES POLICY",
    paragraphs: [
      p(
        `The ${BRAND.name} website uses cookies and local storage so you can stay signed in, keep chat open, and remember Smart Spot pair picks on this device.`
      ),
      p(
        "These files are used for the terminal to work, not to sell your identity pack. You can clear site data in your browser; you will need to sign in again."
      ),
      p(`Operator: ${COMPANY.legalName}, ${office}.`),
    ],
  },
  {
    id: "website",
    label: "Website Acceptable Use Policy",
    title: "WEBSITE ACCEPTABLE USE POLICY",
    paragraphs: [
      p(
        `You may use the ${BRAND.name} site only with a valid invite, your own credentials, and in line with published terms.`
      ),
      p(
        "Do not attack the service, scrape private client data, share passwords, or upload false deposit proofs. The desk may freeze an account that breaks these rules."
      ),
      p(`${COMPANY.legalName} · ${office} · ${COMPANY.email}.`),
    ],
  },
  {
    id: "kyc",
    label: "KYC Desk Checks",
    title: "KYC DESK CONTROL CERTIFICATE",
    paragraphs: [
      p(
        `${COMPANY.legalName} maintains an identity-review desk for the ${BRAND.name} terminal. Legal name, document type, document number, and a selfie pack are reviewed before full withdrawal limits are enabled.`
      ),
      p(
        "This record confirms that KYC checks are performed by the authorized operator under published terms. It is a desk control certificate of the company."
      ),
      p(
        `Valid ${AUTH.validFrom} — ${AUTH.validTo}. Issued from ${COMPANY.jurisdiction}. Office: ${office}.`
      ),
    ],
  },
  {
    id: "notice",
    label: "Important Notice",
    title: "IMPORTANT NOTICE",
    paragraphs: [
      p(
        `Only ${COMPANY.legalName} operating the ${BRAND.name} terminal from ${office} is authorized to take deposits and pay withdrawals for this desk.`
      ),
      p(
        "Always copy the settlement address from Live Chat on this site. Do not send funds to addresses posted on social media or in unsolicited messages."
      ),
      p(`FSA entity ID ${COMPANY.companyNo}. LEI ${COMPANY.lei}. Support: ${COMPANY.email}.`),
    ],
  },
  {
    id: "fraud",
    label: "Important Notice: Fraudulent Activities",
    title: "NOTICE — FRAUDULENT ACTIVITIES",
    paragraphs: [
      p(
        `${COMPANY.legalName} does not ask for your password, seed phrase, or remote-desktop access. Staff will only review receipts inside official Live Chat.`
      ),
      p(
        "Clone sites, fake managers, and unofficial deposit addresses are not the desk. If you are unsure, open Live Chat on this domain and confirm the official TRC-20 rail before sending funds."
      ),
      p(
        `Report suspected fraud to ${COMPANY.email}. Legal name and office: ${COMPANY.legalName}, ${office}.`
      ),
    ],
  },
  {
    id: "feeds",
    label: "Live Market Feeds",
    title: "LIVE MARKET FEED ATTESTATION",
    paragraphs: [
      p(
        `${COMPANY.legalName} attests that the ${BRAND.name} desk streams live market charts for crypto, FX, stocks, and related contracts as shown on the terminal.`
      ),
      p(
        "Pricing displays are for desk execution on this platform. This attestation covers operational feed presentation by the authorized operator."
      ),
      p(`Valid ${AUTH.validFrom} — ${AUTH.validTo}. ${office}.`),
    ],
  },
  {
    id: "invite",
    label: "Invite-only Network",
    title: "INVITE-ONLY ACCESS CERTIFICATE",
    paragraphs: [
      p(
        `Access to the ${BRAND.name} terminal is invite-gated. ${COMPANY.legalName} issues and reviews invite codes so new accounts join through the authorized network.`
      ),
      p(
        "This certificate confirms the invite-only operating model of the desk. Registered office remains unchanged."
      ),
      p(`Valid ${AUTH.validFrom} — ${AUTH.validTo}. ${COMPANY.legalName}, ${office}.`),
    ],
  },
  {
    id: "chat",
    label: "24/7 Live Chat",
    title: "SUPPORT DESK CERTIFICATE",
    paragraphs: [
      p(
        `${COMPANY.legalName} operates 24/7 Live Chat for the ${BRAND.name} brand, covering deposits, withdrawals, identity checks, and desk questions.`
      ),
      p(
        "Receipts and support threads stay with the authorized operator at the registered office below."
      ),
      p(`Valid ${AUTH.validFrom} — ${AUTH.validTo}. ${office}.`),
    ],
  },
  {
    id: "domain",
    label: "Approved Trade and Domain Name",
    title: "APPROVED TRADE AND DOMAIN NAME",
    paragraphs: [
      p(
        `${COMPANY.legalName} authorizes use of the ${BRAND.name} trade name and this terminal for seconds trading, Smart Spot Trade, AI Futures Strategy, and related client services.`
      ),
      p(
        "The legal entity, company number, and registered office do not change when the brand is displayed on the website."
      ),
      p(
        `Operator: ${COMPANY.legalName}. FSA entity ID ${COMPANY.companyNo}. LEI ${COMPANY.lei}. Office: ${office}, ${COMPANY.jurisdiction}.`
      ),
    ],
  },
];

export function legalDocById(id) {
  return LEGAL_DOCS.find((d) => d.id === id) || LEGAL_DOCS[0];
}

export function legalDocsWithEmail(email) {
  const from = COMPANY.email;
  const to = String(email || from).trim() || from;
  if (to === from) return LEGAL_DOCS;
  return LEGAL_DOCS.map((d) => ({
    ...d,
    paragraphs: Array.isArray(d.paragraphs)
      ? d.paragraphs.map((x) => String(x).split(from).join(to))
      : d.paragraphs,
  }));
}
