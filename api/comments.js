import { enabled } from "./_dates.js";
import { AUTHORS, PAGES, identify, sanitize, pathname, safeComment, commentStore } from "./_comments.js";

const ORIGINS = new Set([
  "https://chica.keicodes.dev", "https://chica-date-scheduler.vercel.app", "https://chica-ilychicaaa.vercel.app",
  "https://love-voucher-book.vercel.app", "https://para-sa-chica.vercel.app", "https://kwento-natin.vercel.app"
]);

export default async function handler(req, res, options = {}) {
  const store = options.store || commentStore;
  res.setHeader("cache-control", "private, no-store");
  res.setHeader("vary", "Origin");
  res.setHeader("x-content-type-options", "nosniff");
  const origin = req.headers?.origin;
  if (origin && !ORIGINS.has(origin)) return res.status(403).json({ ok: false, error: "origin" });
  if (origin) res.setHeader("access-control-allow-origin", origin);
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("allow", "GET, POST, OPTIONS");
    return res.status(405).json({ ok: false, error: "method" });
  }
  const author = identify(req.headers?.authorization, options.access);
  if (!author) return res.status(401).json({ ok: false, error: "access" });
  if (!(options.enabled ?? enabled())) return res.status(503).json({ ok: false, error: "storage" });
  try {
    if (req.method === "GET") {
      const page = req.query?.page;
      const before = req.query?.before;
      if (!PAGES.has(page) || (before !== undefined && (typeof before !== "string" || before.length > 200 || !before.startsWith(`library-comments/v1/${page}/`)))) return res.status(400).json({ ok: false, error: "page" });
      const result = await store.page(page, before);
      return res.status(200).json({ ok: true, viewer: { author, name: AUTHORS[author] }, ...result });
    }
    if (!/^application\/json(?:;|$)/i.test(req.headers?.["content-type"] || "")) return res.status(415).json({ ok: false, error: "json" });
    if (Buffer.byteLength(JSON.stringify(req.body || {})) > 10000) return res.status(413).json({ ok: false, error: "size" });
    const input = sanitize(req.body);
    if (!input) return res.status(400).json({ ok: false, error: "comment" });
    const key = pathname(input.page, author, input.id);
    const existing = safeComment(await store.read(key), input.page);
    if (existing) {
      if (existing.text !== input.text) return res.status(409).json({ ok: false, error: "immutable" });
      return res.status(200).json({ ok: true, comment: existing });
    }
    const entry = { ...input, author, name: AUTHORS[author], createdAt: (options.now || Date.now)() };
    try {
      await store.append(key, entry);
    } catch (error) {
      // A retried request may race its original. Accept only the exact already-saved comment.
      const saved = safeComment(await store.read(key), input.page);
      if (!saved) throw error;
      if (saved.text !== input.text) return res.status(409).json({ ok: false, error: "immutable" });
      return res.status(200).json({ ok: true, comment: saved });
    }
    return res.status(201).json({ ok: true, comment: entry });
  } catch (error) {
    console.error("comments store failed:", error?.name);
    return res.status(503).json({ ok: false, error: "storage" });
  }
}
