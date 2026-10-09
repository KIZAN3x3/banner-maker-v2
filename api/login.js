import { signToken, isSameOrigin, safeEqual } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isSameOrigin(req)) return res.status(403).json({ error: "forbidden" });
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).json({ error: "server not configured" });

  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!password || !safeEqual(password, expected)) {
    await new Promise(r => setTimeout(r, 500)); // 総当たり対策の待ち時間
    return res.status(401).json({ error: "パスワードが違います" });
  }

  const signed = signToken();
  if (!signed) return res.status(500).json({ error: "server not configured" });
  return res.status(200).json(signed);
}
