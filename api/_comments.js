import { createHash, timingSafeEqual } from "node:crypto";
import { get, list, put } from "@vercel/blob";
import { creds } from "./_dates.js";
import { COMMENT_ACCESS } from "./_comment-access.js";

export const AUTHORS = Object.freeze({ chico: "Chico", chicaaa: "Chicaaa" });
// system-check is an isolated smoke-test thread; no public page renders its records.
export const PAGES = new Set(["library", "oras", "555", "date", "vouchers", "second", "third", "ilychicaaa", "system-check", ...["1010", "1111", "1212", "111", "222", "333", "444", "555"].map(slot => `oras-${slot}`)]);
export const ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const LIMIT = 1200;
const ROOT = "library-comments/v1/";

export function identify(header, access = COMMENT_ACCESS) {
  if (typeof header !== "string") return null;
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(header || "")?.[1];
  if (!token) return null;
  const digest = createHash("sha256").update(token).digest();
  for (const [role, hash] of Object.entries(access)) {
    if (AUTHORS[role] && /^[a-f0-9]{64}$/.test(hash) && timingSafeEqual(digest, Buffer.from(hash, "hex"))) return role;
  }
  return null;
}

export function sanitize(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !PAGES.has(body.page) || typeof body.id !== "string" || !ID.test(body.id) || typeof body.text !== "string") return null;
  const text = body.text.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if (!text || text.length > LIMIT) return null;
  return { id: body.id, page: body.page, text };
}

export function pathname(page, author, id) {
  return `${ROOT}${page}/${author}-${id}.json`;
}

export function safeComment(value, page) {
  if (!value || value.page !== page || typeof value.author !== "string" || !Object.hasOwn(AUTHORS, value.author) || typeof value.id !== "string" || !ID.test(value.id) || typeof value.text !== "string" || !value.text.trim() || value.text.length > LIMIT || !Number.isFinite(value.createdAt) || !Number.isFinite(new Date(value.createdAt).getTime())) return null;
  return { id: value.id, page, author: value.author, name: AUTHORS[value.author], text: value.text, createdAt: value.createdAt };
}

// Every comment has its own immutable object. Concurrent submissions cannot overwrite each other.
export const createCommentStore = (sdk = { get, list, put }) => ({
  async read(key) {
    const response = await sdk.get(key, { access: "private", useCache: false, ...creds() });
    if (!response || response.statusCode !== 200) return null;
    const text = await new Response(response.stream).text();
    try { return JSON.parse(text); }
    catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      console.error("invalid comment JSON:", key);
      return { invalid: true };
    }
  },
  async append(key, entry) {
    await sdk.put(key, JSON.stringify(entry), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: false, ...creds() });
  },
  async page(page, before) {
    let cursor;
    const blobs = [];
    do {
      const result = await sdk.list({ prefix: `${ROOT}${page}/`, limit: 1000, ...(cursor ? { cursor } : {}), ...creds() });
      blobs.push(...result.blobs);
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt) || a.pathname.localeCompare(b.pathname));
    const start = before ? blobs.findIndex(blob => blob.pathname === before) + 1 : 0;
    if (before && start === 0) return { comments: [], next: null };
    const selected = blobs.slice(start, start + 30);
    const values = await Promise.all(selected.map(blob => this.read(blob.pathname)));
    return {
      comments: values.map(value => safeComment(value, page)).filter(Boolean).sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id)),
      next: blobs.length > start + selected.length ? selected.at(-1)?.pathname || null : null
    };
  }
});
export const commentStore = createCommentStore();
