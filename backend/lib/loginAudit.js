/**
 * Record successful sign-ins with IP, device, and geo for Super Admin history.
 */
import LoginEvent from "../models/LoginEvent.js";

const GEO_CACHE = new Map();
const GEO_TTL_MS = 24 * 60 * 60 * 1000;

export function clientIp(req) {
  const header = (name) => String(req.headers[name] || "").trim();
  const forwarded = header("x-forwarded-for").split(",")[0].trim();
  const raw =
    header("cf-connecting-ip") ||
    forwarded ||
    header("x-real-ip") ||
    req.ip ||
    req.socket?.remoteAddress ||
    "";
  return String(raw).replace(/^::ffff:/, "").slice(0, 80);
}

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

export function parseDevice(userAgent) {
  const s = String(userAgent || "");
  const mobile =
    /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      s
    );
  let browser = "Browser";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(s)) browser = "Opera";
  else if (/Chrome\//.test(s)) browser = "Chrome";
  else if (/Safari\//.test(s) && !/Chrome/i.test(s)) browser = "Safari";
  else if (/Firefox\//.test(s)) browser = "Firefox";

  let os = "Unknown";
  if (/Windows/i.test(s)) os = "Windows";
  else if (/Android/i.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";
  else if (/Mac OS X/i.test(s)) os = "macOS";
  else if (/Linux/i.test(s)) os = "Linux";

  return {
    kind: mobile ? "mobile" : "web",
    browser,
    os,
    userAgent: s.slice(0, 400),
  };
}

export async function lookupGeo(ip) {
  if (!ip || isPrivateIp(ip)) {
    return {
      country: "",
      region: "",
      city: "",
      isp: "",
      locationLabel: "Local / unknown",
    };
  }
  const hit = GEO_CACHE.get(ip);
  if (hit && Date.now() - hit.t < GEO_TTL_MS) return hit.geo;
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(2500),
    });
    const data = await res.json();
    const geo =
      data?.success === false
        ? {
            country: "",
            region: "",
            city: "",
            isp: "",
            locationLabel: "Unknown",
          }
        : {
            country: String(data.country || "").slice(0, 80),
            region: String(data.region || "").slice(0, 80),
            city: String(data.city || "").slice(0, 80),
            isp: String(data.connection?.isp || data.connection?.org || "").slice(
              0,
              120
            ),
            locationLabel: "",
          };
    geo.locationLabel =
      [geo.city, geo.region, geo.country].filter(Boolean).join(", ") ||
      "Unknown";
    GEO_CACHE.set(ip, { t: Date.now(), geo });
    return geo;
  } catch {
    return {
      country: "",
      region: "",
      city: "",
      isp: "",
      locationLabel: "Unknown",
    };
  }
}

export function serializeLoginEvent(doc) {
  const row = doc?.toObject ? doc.toObject() : { ...doc };
  return {
    id: String(row._id || row.id || ""),
    userId: String(row.user?._id || row.user || ""),
    source: row.source || "login",
    ip: row.ip || "",
    kind: row.kind === "mobile" ? "mobile" : "web",
    os: row.os || "",
    browser: row.browser || "",
    country: row.country || "",
    region: row.region || "",
    city: row.city || "",
    isp: row.isp || "",
    locationLabel: row.locationLabel || "Unknown",
    createdAt: row.createdAt || null,
  };
}

/** Fire-and-forget after a successful password login or first register. */
export function recordLoginEvent(req, user, source = "login") {
  const run = async () => {
    if (!user?._id) return;
    const ip = clientIp(req);
    const device = parseDevice(req.headers["user-agent"]);
    const geo = await lookupGeo(ip);
    await LoginEvent.create({
      user: user._id,
      adminId: user.adminId || null,
      source,
      ip,
      kind: device.kind,
      os: device.os,
      browser: device.browser,
      userAgent: device.userAgent,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      isp: geo.isp,
      locationLabel: geo.locationLabel,
    });
  };
  return run().catch((err) => {
    console.warn("login audit skipped:", err?.message || err);
  });
}
