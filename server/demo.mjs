import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

const COOKIE = "ll_visitor";

const sign = (secret, value) =>
  createHmac("sha256", secret).update(value).digest("base64url");

function readCookie(header = "", name) {
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name)
      return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

export function verifyVisitor(secret, raw) {
  if (!raw) return null;
  const [id, mac] = raw.split(".");
  if (!id || !mac || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const expected = Buffer.from(sign(secret, id));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given)
    ? id
    : null;
}

// Assigns every anonymous visitor a random id in an HMAC-signed, HttpOnly cookie.
export function visitorMiddleware({ secret, ttlHours }) {
  return (req, res, next) => {
    let id = verifyVisitor(secret, readCookie(req.headers.cookie, COOKIE));
    if (!id) {
      id = randomUUID();
      const maxAge = Math.max(1, Math.round(ttlHours * 3600));
      res.append(
        "Set-Cookie",
        `${COOKIE}=${id}.${sign(secret, id)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${req.secure ? "; Secure" : ""}`,
      );
    }
    req.visitor = id;
    next();
  };
}

// Fixed-window in-memory limiter keyed by client IP (cookies can be dropped).
export function rateLimit({ max, windowMs }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
  }, windowMs);
  timer.unref();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || "unknown";
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    res.set("RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return res
        .status(429)
        .json({ error: "Muitas alterações. Tente novamente em instantes." });
    }
    next();
  };
}

export function demoConfig(env = process.env) {
  const on = ["1", "true", "yes"].includes(String(env.DEMO_MODE).toLowerCase());
  if (!on) return null;
  let secret = env.DEMO_SECRET;
  if (!secret) {
    secret = randomBytes(32).toString("hex");
    console.warn(
      "DEMO_SECRET not set: using a random secret; visitors lose their lists on restart.",
    );
  }
  return {
    secret,
    maxLists: Number(env.DEMO_MAX_LISTS) || 20,
    rateLimit: Number(env.DEMO_RATE_LIMIT) || 30,
    rateWindowMs: (Number(env.DEMO_RATE_WINDOW_SECONDS) || 60) * 1000,
    ttlHours: Number(env.DEMO_TTL_HOURS) || 72,
  };
}
