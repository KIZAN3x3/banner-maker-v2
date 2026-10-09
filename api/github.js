import { verifyToken, getBearer, isSameOrigin } from "./_auth.js";

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_OWNER  = "KIZAN3x3";
const GITHUB_REPO   = "banner-maker-v2";
const GITHUB_BRANCH = "main";

const GH_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`;
const HEADERS  = {
  Authorization: `token ${GITHUB_TOKEN}`,
  Accept:        "application/vnd.github.v3+json",
  "Content-Type":"application/json",
};

// メソッドごとに操作できる path（管理画面が実際に使うものだけ）
const ALLOWED_PATHS = {
  GET: [
    /^public\/tabs\.json$/,
    /^public\/templates\/tab_\d+\/template\.json$/,
    /^public\/stamps\/tab_\d+$/,
  ],
  PUT: [
    /^public\/tabs\.json$/,
    /^public\/(bg|sample)_tab_\d+\.png$/,
    /^public\/stamps\/tab_\d+\/index\.json$/,
    /^public\/templates\/tab_\d+\/template\.json$/,
  ],
  DELETE: [
    /^public\/(bg|sample)_tab_\d+\.png$/,
    /^public\/stamps\/tab_\d+\/[^/\\]+\.png$/,
    /^public\/stamps\/tab_\d+\/index\.json$/,
    /^public\/templates\/tab_\d+\/template\.json$/,
  ],
};

// path はクエリから受け取った時点でデコード済み。その値に対して検証する
function isAllowedPath(method, path) {
  if (typeof path !== "string" || !path || path.length > 200) return false;
  if (path.includes("..") || path.startsWith("/") || path.includes("//")) return false;
  if (/[%\\?#\x00-\x1f\x7f]/.test(path)) return false;
  return (ALLOWED_PATHS[method] || []).some(re => re.test(path));
}

// PUT する JSON の形チェック（構造は変えず、壊れたデータの書き込みだけ防ぐ）
function jsonShapeError(path, base64) {
  if (!path.endsWith(".json")) return null;
  let data;
  try { data = JSON.parse(Buffer.from(base64, "base64").toString("utf8")); }
  catch { return "invalid JSON"; }
  if (path.endsWith("/template.json")) {
    return data && typeof data === "object" && Array.isArray(data.elements) ? null : "template.json must have elements array";
  }
  return Array.isArray(data) ? null : `${path.split("/").pop()} must be an array`;
}

// 各セグメントをエンコードして GitHub API の URL を作る（日本語ファイル名にも対応）
const ghUrl = (path) => `${GH_BASE}/${path.split("/").map(encodeURIComponent).join("/")}`;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isSameOrigin(req)) return res.status(403).json({ error: "forbidden" });

  const { method, query } = req;
  const body = req.body || {};
  if (!ALLOWED_PATHS[method]) return res.status(405).json({ error: "method not allowed" });
  if (!verifyToken(getBearer(req))) return res.status(401).json({ error: "unauthorized" });

  const path = query.path;
  if (!path) return res.status(400).json({ error: "path required" });
  if (!isAllowedPath(method, path)) return res.status(403).json({ error: "path not allowed" });

  // ── GET: ファイル or ディレクトリ一覧 ────────────────
  if (method === "GET") {
    const r = await fetch(ghUrl(path), { headers: HEADERS });
    if (r.status === 404) return res.status(200).json({ sha: null, isDir: false });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    // ディレクトリの場合は配列が返る
    if (Array.isArray(data)) {
      return res.status(200).json({ isDir: true, items: data });
    }
    return res.status(200).json({ sha: data.sha, content: data.content });
  }

  // ── PUT: ファイル作成・更新 ───────────────────────────
  if (method === "PUT") {
    const { content, message } = body;
    if (typeof content !== "string" || !content) return res.status(400).json({ error: "content required" });
    const shapeErr = jsonShapeError(path, content);
    if (shapeErr) return res.status(400).json({ error: shapeErr });
    const getR = await fetch(ghUrl(path), { headers: HEADERS });
    const putBody = { message, content, branch: GITHUB_BRANCH };
    if (getR.ok) {
      const existing = await getR.json();
      if (!Array.isArray(existing) && existing.sha) putBody.sha = existing.sha;
    }
    const r = await fetch(ghUrl(path), {
      method:  "PUT",
      headers: HEADERS,
      body:    JSON.stringify(putBody),
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    return res.status(200).json({ ok: true });
  }

  // ── DELETE: ファイル削除 ──────────────────────────────
  const { message } = body;
  const getR = await fetch(ghUrl(path), { headers: HEADERS });
  if (!getR.ok) return res.status(200).json({ ok: true });
  const existing = await getR.json();
  if (Array.isArray(existing)) return res.status(400).json({ error: "cannot delete directory directly" });
  const r = await fetch(ghUrl(path), {
    method:  "DELETE",
    headers: HEADERS,
    body:    JSON.stringify({ message, sha: existing.sha, branch: GITHUB_BRANCH }),
  });
  if (!r.ok) return res.status(r.status).json({ error: await r.text() });
  return res.status(200).json({ ok: true });
}
