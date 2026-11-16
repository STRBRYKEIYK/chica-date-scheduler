// POST adds a memory (a short note and one photo) to a date that has already happened.
// Body: { id, note?, photo? }  photo is a JPEG data URL, already shrunk by the page.
// The photo is a private file with a random name; /api/photo is the only way to read it back.
import { randomBytes } from "node:crypto";
import { enabled, blobIO, PHOTO_KEY, manilaToday } from "./_dates.js";
import { upsert, isCancelled } from "../src/dates-core.js";

const clean = (v, max) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max) : "";

const MAX_BYTES = 1_500_000;
const PREFIX = "data:image/jpeg;base64,";

export default async function handler(req, res, io = blobIO) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ ok: false }); return; }
  if (!enabled()) { res.status(200).json({ ok: false, enabled: false }); return; }
  const b = req.body && typeof req.body === "object" ? req.body : {};
  const id = typeof b.id === "string" ? b.id : "";
  const note = clean(b.note, 300);
  const photo = typeof b.photo === "string" ? b.photo : "";
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || (!note && !photo)) { res.status(400).json({ ok: false }); return; }

  let buf = null;
  if (photo) {
    if (!photo.startsWith(PREFIX) || photo.length > MAX_BYTES * 1.4) { res.status(400).json({ ok: false, why: "photo" }); return; }
    buf = Buffer.from(photo.slice(PREFIX.length), "base64");
    // a real JPEG starts FF D8 FF, and is not tiny or huge
    if (buf.length < 200 || buf.length > MAX_BYTES || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) { res.status(400).json({ ok: false, why: "photo" }); return; }
  }

  try {
    const list = await io.read();
    const cur = list.find((x) => x && x.id === id);
    if (!cur || isCancelled(cur)) { res.status(404).json({ ok: false }); return; }
    if (cur.date > manilaToday()) { res.status(409).json({ ok: false, why: "not-yet" }); return; }

    let key = cur.mem && cur.mem.photo ? cur.mem.photo : "";
    const old = key;
    if (buf) {
      key = `m-${randomBytes(12).toString("base64url")}.jpg`;
      if (!PHOTO_KEY.test(key)) throw new Error("bad key");
      await io.putPhoto(key, buf);
    }
    const now = Date.now();
    const entry = { ...cur, mem: { note: note || (cur.mem && cur.mem.note) || "", photo: key, at: now }, savedAt: now };
    await io.write(upsert(list, entry));
    if (buf && old && old !== key && io.delPhoto) await io.delPhoto(old);
    res.status(200).json({ ok: true, entry });
  } catch (e) {
    console.error("memory failed:", e && e.name, e && e.message);
    res.status(500).json({ ok: false });
  }
}
