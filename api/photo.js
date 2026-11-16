// GET /api/photo?k=m-xxxx.jpg  streams back one memory photo from the private store.
import { enabled, blobIO, PHOTO_KEY } from "./_dates.js";

export default async function handler(req, res, io = blobIO) {
  if (req.method !== "GET") { res.status(405).end(); return; }
  const k = req.query && typeof req.query.k === "string" ? req.query.k : "";
  if (!PHOTO_KEY.test(k) || !enabled()) { res.status(404).end(); return; }
  try {
    const buf = await io.getPhoto(k);
    if (!buf) { res.status(404).end(); return; }
    res.setHeader("content-type", "image/jpeg");
    // the name is random and never reused, so the bytes behind it never change
    res.setHeader("cache-control", "private, max-age=86400");
    res.setHeader("x-content-type-options", "nosniff");
    res.status(200).send(buf);
  } catch (e) {
    console.error("photo failed:", e && e.name, e && e.message);
    res.status(500).end();
  }
}
