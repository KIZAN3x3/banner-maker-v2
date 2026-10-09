// 管理者トークンの署名・検証（"_" で始まるため Vercel の API ルートにはならない）
import crypto from "node:crypto";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12時間

function getSecret() {
  const s = process.env.ADMIN_TOKEN_SECRET;
  return typeof s === "string" && s.length >= 32 ? s : null; // 未設定・短すぎる場合は常に失敗させる
}

function hmac(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest();
}

export function signToken() {
  const secret = getSecret();
  if (!secret) return null;
  const iat = Date.now();
  const exp = iat + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ iat, exp })).toString("base64url");
  const sig = hmac(secret, payload).toString("base64url");
  return { token: `${payload}.${sig}`, exp };
}

export function verifyToken(token) {
  const secret = getSecret();
  if (!secret || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const [payload, sig] = parts;
  const expected = hmac(secret, payload);
  const got = Buffer.from(sig, "base64url");
  if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof exp === "number" && Date.now() < exp;
  } catch { return false; }
}

export function getBearer(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

// 別オリジンからのブラウザ経由の呼び出しを拒否（Origin ヘッダーがある場合のみ判定）
export function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  try { return new URL(origin).host === host; } catch { return false; }
}

// 長さの違いで判別されないよう、両方を SHA-256 にしてから比較
export function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
