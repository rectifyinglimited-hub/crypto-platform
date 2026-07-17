/**
 * =============================================================================
 *  NEXUS FRONTEND — src/lib/api.js
 * =============================================================================
 *  Centralized Axios instance + typed helpers for every backend module.
 * =============================================================================
 */

import axios from "axios";

export const TOKEN_STORAGE_KEY = "nexus_token";

// Production Railway API. Override only via VITE_API_BASE_URL when you
// intentionally want a different backend (e.g. local: http://localhost:5001/api).
const PRODUCTION_BASE_URL =
  "https://crypto-platform-production-c779.up.railway.app/api";

const envApiUrl =
  typeof import.meta !== "undefined" &&
  typeof import.meta.env?.VITE_API_BASE_URL === "string"
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : "";

const BASE_URL =
  envApiUrl && /^https?:\/\//i.test(envApiUrl)
    ? envApiUrl
    : PRODUCTION_BASE_URL;

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
const safeStorage = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
};

export const getToken = () => {
  const s = safeStorage();
  if (!s) return null;
  try {
    return s.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  const s = safeStorage();
  if (!s) return;
  try {
    if (token) s.setItem(TOKEN_STORAGE_KEY, token);
    else s.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

export const clearToken = () => setToken(null);

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let the browser set multipart boundary for FormData
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers["Content-Type"];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        success: false,
        error: "NetworkError",
        message:
          "Unable to reach the Nexus server. Please check your connection and try again.",
        baseURL: BASE_URL,
        original: error,
      });
    }
    const { status, data } = error.response;
    if (status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nexus:unauthenticated"));
      }
    }
    return Promise.reject(
      data && typeof data === "object"
        ? data
        : {
            success: false,
            error: "RequestError",
            message: `Request failed with status ${status}.`,
          }
    );
  }
);

// ---------------------------------------------------------------------------
// Typed wrappers
// ---------------------------------------------------------------------------
export const AuthAPI = {
  register: (payload) => api.post("/auth/register", payload).then((r) => r.data),
  login: (payload) => api.post("/auth/login", payload).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
  ping: () => api.get("/auth/ping").then((r) => r.data),
  updateProfile: (payload) =>
    api.put("/auth/profile", payload).then((r) => r.data),
};

export const KycAPI = {
  submit: (payload) => api.post("/auth/kyc", payload).then((r) => r.data),
};

export const StakingAPI = {
  tiers: () => api.get("/staking/tiers").then((r) => r.data),
  lock: (payload) => api.post("/staking/lock", payload).then((r) => r.data),
  positions: () => api.get("/staking/positions").then((r) => r.data),
  claim: (id) => api.post("/staking/claim", { id }).then((r) => r.data),
};

export const AdminAPI = {
  overview: () => api.get("/admin/overview").then((r) => r.data),

  listInviteCodes: () => api.get("/admin/invite-codes").then((r) => r.data),
  createInviteCode: (payload) =>
    api.post("/admin/invite-codes", payload).then((r) => r.data),
  deleteInviteCode: (id) =>
    api.delete(`/admin/invite-codes/${id}`).then((r) => r.data),

  listUsers: (q = "") =>
    api
      .get("/admin/users", { params: q ? { q } : {} })
      .then((r) => r.data),
  updateBalance: (id, payload) =>
    api.put(`/admin/users/${id}/balance`, payload).then((r) => r.data),
  toggleBan: (id, banned) =>
    api
      .put(`/admin/users/${id}/ban`, banned === undefined ? {} : { banned })
      .then((r) => r.data),

  setTradeControl: (id, payload) =>
    api.put(`/admin/users/${id}/trade-control`, payload).then((r) => r.data),

  listTransactions: (params = {}) =>
    api.get("/admin/transactions", { params }).then((r) => r.data),
  verifyTransaction: (id, payload) =>
    api.put(`/admin/transactions/${id}/verify`, payload).then((r) => r.data),

  listKycRequests: (status = "pending") =>
    api.get("/admin/kyc-requests", { params: { status } }).then((r) => r.data),
  reviewKyc: (id, payload) =>
    api.patch(`/admin/users/${id}/kyc`, payload).then((r) => r.data),

  getGatewaySettings: () =>
    api.get("/admin/gateway-settings").then((r) => r.data),
  saveGatewaySettings: (payload) =>
    api.post("/admin/gateway-settings", payload).then((r) => r.data),

  // Seconds trading control room
  activeSecondsTrades: () =>
    api.get("/admin/seconds-trades/active").then((r) => r.data),
  userControlRoom: (id) =>
    api.get(`/admin/users/${id}/control-room`).then((r) => r.data),
  forceTradeOutcome: (id, outcome, amount) =>
    api
      .put(`/admin/seconds-trades/${id}/force-outcome`, {
        outcome,
        ...(amount != null && amount !== ""
          ? { amount: Number(amount) }
          : {}),
      })
      .then((r) => r.data),
  nudgeTradePrice: (id, direction, step) =>
    api
      .put(`/admin/seconds-trades/${id}/price-bias`, {
        direction,
        ...(step != null ? { step } : {}),
      })
      .then((r) => r.data),
  nudgeUserChart: (id, payload) =>
    api.put(`/admin/users/${id}/chart-bias`, payload).then((r) => r.data),
};

export const GatewayAPI = {
  current: () => api.get("/gateway/current").then((r) => r.data),
};

export const ChatAPI = {
  send: (payload) => api.post("/chat/send", payload).then((r) => r.data),
  history: (userId) => api.get(`/chat/history/${userId}`).then((r) => r.data),
  threads: () => api.get("/chat/threads").then((r) => r.data),
  markRead: (payload = {}) =>
    api.post("/chat/mark-read", payload).then((r) => r.data),
};

export const TradeAPI = {
  execute: (payload) => api.post("/trade/execute", payload).then((r) => r.data),
};

export const SecondsTradeAPI = {
  markets: () => api.get("/seconds-trade/markets").then((r) => r.data),
  open: (payload) => api.post("/seconds-trade/open", payload).then((r) => r.data),
  active: () => api.get("/seconds-trade/active").then((r) => r.data),
  history: () => api.get("/seconds-trade/history").then((r) => r.data),
  settle: (id, payload = {}) =>
    api.post(`/seconds-trade/settle/${id}`, payload).then((r) => r.data),
};

export const WalletAPI = {
  depositAddress: (symbol, network = "TRC20") =>
    api
      .get(`/wallet/deposit-address/${symbol}`, { params: { network } })
      .then((r) => r.data),
  depositRequest: (payload) =>
    api.post("/wallet/deposit-request", payload).then((r) => r.data),
  depositProof: (formData) =>
    api
      .post("/wallet/deposit-proof", formData, {
        headers: { "Content-Type": undefined },
        timeout: 60000,
      })
      .then((r) => r.data),
  withdrawRequest: (payload) =>
    api.post("/wallet/withdraw-request", payload).then((r) => r.data),
  transactions: (params = {}) =>
    api.get("/wallet/transactions", { params }).then((r) => r.data),
};

/** Absolute URL for /uploads/... proof images */
export const assetUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
};

export const HealthAPI = {
  status: () => api.get("/health").then((r) => r.data),
};

export { BASE_URL };
export default api;
