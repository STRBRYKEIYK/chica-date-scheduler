// GET lists the dates Chica has set; POST remembers one. The Library calendar reads this to draw its hearts.
import { enabled, sanitize, upsert, dedupe, blobIO, blobVarNames } from "./_dates.js";

export default async function handler(req, res, io = blobIO) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "GET" && req.method !== "POST") { res.status(405).json({ ok: false }); return; }
  if (!enabled()) { res.status(200).json({ ok: req.method === "GET", enabled: false, dates: [], blobVars: blobVarNames() }); return; }
  try {
    if (req.method === "GET") {
      res.status(200).json({ ok: true, enabled: true, dates: dedupe(await io.read()) });
      return;
    }
    const entry = sanitize(req.body);
    if (!entry) { res.status(400).json({ ok: false }); return; }
    await io.write(upsert(await io.read(), entry));
    res.status(200).json({ ok: true, enabled: true });
  } catch (e) {
    console.error("dates store failed:", e && e.name, e && e.message);
    res.status(500).json({ ok: false });
  }
}
