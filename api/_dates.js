// The dates Chica sets, kept on the server so the Library calendar shows them on every device.
// Stored as one small JSON file in a Vercel Blob store (needs BLOB_READ_WRITE_TOKEN, see README).
// Files starting with "_" are not deployed as functions.
import { put, get, del } from "@vercel/blob";
import { STATUSES, upsert, dedupe, mergeLists } from "../src/dates-core.js";

export { upsert, dedupe, mergeLists };
export { slot } from "../src/dates-core.js";

const PATH = "chica-dates.json";
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const PID = /^[a-z0-9-]{1,40}$/;
export const PHOTO_KEY = /^m-[A-Za-z0-9_-]{16,32}\.jpg$/;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const clean = (v, max) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max) : "";

// Vercel names the store's variables BLOB_READ_WRITE_TOKEN (or BLOB_STORE_ID with OIDC), sometimes with a prefix.
export function creds(env = process.env) {
  const token = Object.keys(env).find((k) => k.endsWith("BLOB_READ_WRITE_TOKEN") && env[k]);
  if (token) return { token: env[token] };
  const id = Object.keys(env).find((k) => k.endsWith("BLOB_STORE_ID") && env[k]);
  if (id) return { storeId: env[id] };
  return null;
}
export const enabled = (env = process.env) => creds(env) !== null;
export const blobVarNames = (env = process.env) => Object.keys(env).filter((k) => /BLOB/i.test(k)); // names only, never values
const access = (env = process.env) => (env.BLOB_ACCESS === "public" ? "public" : "private");

// Turns whatever the browser sent into one safe entry, or null when it is not a real date plan.
// The memory (mem) is never taken from here, it only changes through the memory endpoint.
export function sanitize(b, now = Date.now()) {
  if (!b || typeof b !== "object") return null;
  const id = typeof b.id === "string" ? b.id : "";
  const m = ISO.exec(typeof b.date === "string" ? b.date : "");
  if (!ID.test(id) || !m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (y < 2025 || y > 2040 || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return {
    id, date: b.date, time: clean(b.time, 10), place: clean(b.place, 140), area: clean(b.area, 80),
    vibe: clean(b.vibe, 80), pid: typeof b.pid === "string" && PID.test(b.pid) ? b.pid : "",
    by: b.by === "chico" ? "chico" : "chica", status: STATUSES.includes(b.status) ? b.status : "confirmed",
    note: clean(b.note, 300), sent: b.sent === true, savedAt: now
  };
}

// Today in Manila (UTC+8, no daylight saving), as YYYY-MM-DD.
export const manilaToday = (now = Date.now()) => new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10);

export const blobIO = {
  async read() {
    const r = await get(PATH, { access: access(), useCache: false, ...creds() });
    if (!r || r.statusCode !== 200) return [];
    const a = JSON.parse(await new Response(r.stream).text());
    return Array.isArray(a) ? a : [];
  },
  async write(list) {
    await put(PATH, JSON.stringify(list), { access: access(), contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, ...creds() });
  },
  // Memory photos: private files named memories/<key>. The key is random, and only /api/photo can read them back.
  async putPhoto(key, buf) {
    await put(`memories/${key}`, buf, { access: access(), contentType: "image/jpeg", addRandomSuffix: false, allowOverwrite: false, ...creds() });
  },
  async getPhoto(key) {
    const r = await get(`memories/${key}`, { access: access(), useCache: false, ...creds() });
    if (!r || r.statusCode !== 200) return null;
    return Buffer.from(await new Response(r.stream).arrayBuffer());
  },
  async delPhoto(key) {
    try { await del(`memories/${key}`, creds() || undefined); } catch { /* an old photo that cannot be removed is only wasted space */ }
  }
};
