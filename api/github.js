const GITHUB_TOKEN  = process.env.VITE_GITHUB_TOKEN;
const GITHUB_OWNER  = "KIZAN3x3";
const GITHUB_REPO   = "banner-maker-v2";
const GITHUB_BRANCH = "main";

const GH_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`;
const HEADERS  = {
  Authorization: `token ${GITHUB_TOKEN}`,
  Accept:        "application/vnd.github.v3+json",
  "Content-Type":"application/json",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { method, query, body } = req;
  const path = query.path;
  if (!path) return res.status(400).json({ error: "path required" });

  // ── GET: ファイル or チE��レクトリ一覧 ────────────────
  if (method === "GET") {
    const r = await fetch(`${GH_BASE}/${path}`, { headers: HEADERS });
    if (r.status === 404) return res.status(200).json({ sha: null, isDir: false });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    // チE��レクトリの場合�E配�Eが返る
    if (Array.isArray(data)) {
      return res.status(200).json({ isDir: true, items: data });
    }
    return res.status(200).json({ sha: data.sha, content: data.content });
  }

  // ── PUT: ファイル作�E・更新 ───────────────────────────
  if (method === "PUT") {
    const { content, message } = body;
    const getR = await fetch(`${GH_BASE}/${path}`, { headers: HEADERS });
    const putBody = { message, content, branch: GITHUB_BRANCH };
    if (getR.ok) {
      const existing = await getR.json();
      if (!Array.isArray(existing) && existing.sha) putBody.sha = existing.sha;
    }
    const r = await fetch(`${GH_BASE}/${path}`, {
      method:  "PUT",
      headers: HEADERS,
      body:    JSON.stringify(putBody),
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    return res.status(200).json({ ok: true });
  }

  // ── DELETE: ファイル削除 ──────────────────────────────
  if (method === "DELETE") {
    const { message } = body;
    const getR = await fetch(`${GH_BASE}/${path}`, { headers: HEADERS });
    if (!getR.ok) return res.status(200).json({ ok: true });
    const existing = await getR.json();
    if (Array.isArray(existing)) return res.status(400).json({ error: "cannot delete directory directly" });
    const r = await fetch(`${GH_BASE}/${path}`, {
      method:  "DELETE",
      headers: HEADERS,
      body:    JSON.stringify({ message, sha: existing.sha, branch: GITHUB_BRANCH }),
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "method not allowed" });
}
