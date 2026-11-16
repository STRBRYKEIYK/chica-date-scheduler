// The dates Chica sets, kept on the server so the Library calendar shows them on every device.
// Stored as one small JSON file in a Vercel Blob store (needs BLOB_READ_WRITE_TOKEN, see README).
// Files starting with "_" are not deployed as functions.
import { put, get } from "@vercel/blob";

const PATH = "chica-dates.json";
const MAX = 40;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
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
    vibe: clean(b.vibe, 80), sent: b.sent === true, savedAt: now
  };
}

// A date is the same date when the day and the place match (case and spacing ignored), whichever plan id saved it.
// Every new browser tab gets a new plan id, so ids alone let the same date pile up.
export const slot = (x) => `${x.date}|${String(x.place || "").toLowerCase().replace(/\s+/g, " ").trim()}`;

// Collapses repeats of the same date: the newest one wins, and if any of them was sent it stays sent.
export function dedupe(list) {
  const by = new Map();
  for (const x of Array.isArray(list) ? list : []) {
    if (!x || typeof x !== "object" || typeof x.date !== "string") continue;
    const k = slot(x), c = by.get(k);
    if (!c) { by.set(k, x); continue; }
    const win = (x.savedAt || 0) >= (c.savedAt || 0) ? x : c;
    by.set(k, { ...win, sent: Boolean(x.sent || c.sent) });
  }
  return [...by.values()].sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
}

// One entry per plan id and per date+place. A plan that was already sent stays sent.
export function upsert(list, entry, max = MAX) {
  const old = list.filter((x) => x && (x.id === entry.id || (typeof x.date === "string" && slot(x) === slot(entry))));
  const next = { ...entry, sent: entry.sent || old.some((x) => x.sent) };
  return dedupe(list.filter((x) => !old.includes(x)).concat(next)).slice(-max);
}

export const blobIO = {
  async read() {
    const r = await get(PATH, { access: access(), useCache: false, ...creds() });
    if (!r || r.statusCode !== 200) return [];
    const a = JSON.parse(await new Response(r.stream).text());
    return Array.isArray(a) ? a : [];
  },
  async write(list) {
    await put(PATH, JSON.stringify(list), { access: access(), contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, ...creds() });
  }
};
