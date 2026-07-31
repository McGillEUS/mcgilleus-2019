const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

/** bcrypt hash for the documented example password `eus-admin-change-me` (cost 10). */
const KNOWN_DEFAULT_PASSWORD_HASH =
  "$2b$10$v3cn8HQEBcWzXqlq18RFGeyUUCGwzSNkxSgaTw4kwPtDgl6HWOtrq";

/** Valid bcrypt hash used only so compare always runs (timing). */
const DUMMY_PASSWORD_HASH =
  "$2b$12$CeqF0a1hZq8i.1nQdWnH.eG5xKkQnJ8fKqG3n0m5dY2pL9sR4tU6u";

const BCRYPT_ROUNDS = 12;
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 14;

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a ?? ""), "utf8");
  const right = Buffer.from(String(b ?? ""), "utf8");
  const len = Math.max(left.length, right.length, 1);
  const leftPad = Buffer.alloc(len);
  const rightPad = Buffer.alloc(len);
  left.copy(leftPad);
  right.copy(rightPad);
  const equal = crypto.timingSafeEqual(leftPad, rightPad);
  return equal && left.length === right.length;
}

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return forwarded || req.socket?.remoteAddress || "unknown";
}

function createLoginLimiter() {
  /** @type {Map<string, { failures: number[], lockedUntil: number }>} */
  const attempts = new Map();

  function prune(entry, now) {
    entry.failures = entry.failures.filter((ts) => now - ts < WINDOW_MS);
  }

  function get(ip) {
    let entry = attempts.get(ip);
    if (!entry) {
      entry = { failures: [], lockedUntil: 0 };
      attempts.set(ip, entry);
    }
    return entry;
  }

  return {
    check(ip) {
      const now = Date.now();
      const entry = get(ip);
      if (entry.lockedUntil > now) {
        const retryAfterSec = Math.ceil((entry.lockedUntil - now) / 1000);
        const err = new Error(
          `Too many failed login attempts. Try again in ${retryAfterSec} seconds.`
        );
        err.status = 429;
        err.retryAfterSec = retryAfterSec;
        throw err;
      }
      prune(entry, now);
    },
    fail(ip) {
      const now = Date.now();
      const entry = get(ip);
      prune(entry, now);
      entry.failures.push(now);
      if (entry.failures.length >= MAX_ATTEMPTS) {
        entry.lockedUntil = now + LOCKOUT_MS;
        entry.failures = [];
      }
    },
    success(ip) {
      attempts.delete(ip);
    },
  };
}

function isDefaultPasswordHash(hash) {
  return timingSafeEqualString(hash || "", KNOWN_DEFAULT_PASSWORD_HASH);
}

function validateNewPassword(password, username) {
  const value = String(password ?? "");
  if (value.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (value.length > 200) {
    throw new Error("Password is too long.");
  }
  if (username && value.toLowerCase() === String(username).toLowerCase()) {
    throw new Error("Password cannot match the username.");
  }
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    throw new Error("Password must include letters and numbers.");
  }
  if (value === "eus-admin-change-me") {
    throw new Error("Choose a password other than the documented example.");
  }
  return value;
}

function createAdminAuth({ config, configPath, isProduction }) {
  const limiter = createLoginLimiter();

  if (!config.sessionSecret || config.sessionSecret.length < 32) {
    throw new Error(
      "config.sessionSecret must be at least 32 characters. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    );
  }
  const weakSecrets = new Set([
    "change-me",
    "replace-with-a-long-random-string",
    "dev-only-session-secret-replace-before-deploy-xx",
  ]);
  if (weakSecrets.has(config.sessionSecret)) {
    if (isProduction) {
      throw new Error("config.sessionSecret is still a placeholder. Set a random secret before production.");
    }
    console.warn("[security] Using a placeholder session secret — fine for local dev only.");
  }
  if (!config.adminPasswordHash) {
    throw new Error("config.adminPasswordHash is missing.");
  }
  if (isDefaultPasswordHash(config.adminPasswordHash)) {
    console.warn(
      "[security] Admin password is still the example default. Change it in /admin/ (Account) before sharing the site."
    );
  }

  async function verifyCredentials(username, password) {
    const expectedUser = String(config.adminUsername || "");
    const hash = config.adminPasswordHash || DUMMY_PASSWORD_HASH;
    const userOk = timingSafeEqualString(username, expectedUser);
    let passOk = false;
    try {
      passOk = await bcrypt.compare(String(password || ""), hash);
    } catch (_error) {
      passOk = false;
    }
    // Extra dummy work if username mismatched, to keep timing flatter.
    if (!userOk) {
      try {
        await bcrypt.compare(String(password || ""), DUMMY_PASSWORD_HASH);
      } catch (_error) {
        /* ignore */
      }
    }
    return userOk && passOk;
  }

  function persistConfig() {
    const target = configPath.endsWith("config.example.json")
      ? path.join(path.dirname(configPath), "config.local.json")
      : configPath;
    fs.writeFileSync(target, JSON.stringify(config, null, 2) + "\n", "utf8");
  }

  async function changePassword(currentPassword, newPassword) {
    const ok = await verifyCredentials(config.adminUsername, currentPassword);
    if (!ok) {
      const err = new Error("Current password is incorrect.");
      err.status = 401;
      throw err;
    }
    const next = validateNewPassword(newPassword, config.adminUsername);
    if (currentPassword === next) {
      throw new Error("New password must be different from the current password.");
    }
    config.adminPasswordHash = await bcrypt.hash(next, BCRYPT_ROUNDS);
    persistConfig();
  }

  function requireSameOrigin(req, res, next) {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next();
    }
    const host = req.get("host");
    if (!host) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const origin = req.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host === host) return next();
      } catch (_error) {
        /* fall through */
      }
      return res.status(403).json({ error: "Forbidden" });
    }
    const referer = req.get("referer");
    if (referer) {
      try {
        if (new URL(referer).host === host) return next();
      } catch (_error) {
        /* fall through */
      }
    }
    return res.status(403).json({ error: "Forbidden" });
  }

  function securityHeaders(req, res, next) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("Cache-Control", "no-store");
    if (req.path.startsWith("/admin") || req.path.startsWith("/api/admin")) {
      res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
    }
    next();
  }

  function mustChangePassword() {
    return isDefaultPasswordHash(config.adminPasswordHash);
  }

  return {
    limiter,
    verifyCredentials,
    changePassword,
    requireSameOrigin,
    securityHeaders,
    mustChangePassword,
    clientIp,
    validateNewPassword,
    BCRYPT_ROUNDS,
    MIN_PASSWORD_LENGTH,
  };
}

function resolveConfigPath(root) {
  const local = path.join(root, "config.local.json");
  const example = path.join(root, "config.example.json");
  return fs.existsSync(local) ? local : example;
}

module.exports = {
  createAdminAuth,
  resolveConfigPath,
  isDefaultPasswordHash,
  KNOWN_DEFAULT_PASSWORD_HASH,
  BCRYPT_ROUNDS,
  MIN_PASSWORD_LENGTH,
};
