import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import handler from "../api/comments.js";
import { identify, sanitize, safeComment, createCommentStore } from "../api/_comments.js";

const keys = { chico: "a".repeat(43), chicaaa: "b".repeat(43) };
const access = Object.fromEntries(Object.entries(keys).map(([role, key]) => [role, createHash("sha256").update(key).digest("hex")]));
function memory() {
  const entries = new Map();
  return {
    entries,
    async read(key) { return entries.get(key) || null; },
    async append(key, value) { if (entries.has(key)) throw new Error("Already exists"); entries.set(key, structuredClone(value)); },
    async page(page) { return { comments: [...entries.values()].filter(value => value.page === page), next: null }; }
  };
}
async function call({ method = "GET", role = "chico", body, page = "ilychicaaa", headers = {}, store = memory(), enabled = true } = {}) {
  const req = { method, headers: { ...(role ? { authorization: `Bearer ${keys[role]}` } : {}), "content-type": "application/json", ...headers }, query: { page }, body };
  const res = { code: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; }, end() { return this; } };
  await handler(req, res, { store, access, enabled, now: () => 1795495000000 });
  return res;
}
test("only the two separate bearer keys identify a writer", () => {
  assert.equal(identify(`Bearer ${keys.chico}`, access), "chico");
  assert.equal(identify(`Bearer ${keys.chicaaa}`, access), "chicaaa");
  for (const header of ["", `Bearer ${"x".repeat(43)}`, `Basic ${keys.chico}`, `Bearer ${keys.chico} extra`]) assert.equal(identify(header, access), null);
});
test("unauthenticated visitors cannot read or write comments", async () => {
  for (const method of ["GET", "POST"]) assert.equal((await call({ method, role: null })).code, 401);
});
test("author comes from the access key; data stays in its page", async () => {
  const store = memory(), id = randomUUID();
  const result = await call({ method: "POST", role: "chicaaa", store, body: { id, page: "ilychicaaa", text: "hello\n<script>alert(1)</script>", author: "chico", name: "Someone" } });
  assert.equal(result.code, 201);
  assert.equal(result.body.comment.author, "chicaaa");
  assert.equal(result.body.comment.name, "Chicaaa");
  assert.equal(result.body.comment.createdAt, 1795495000000);
  assert.equal((await call({ store, page: "date" })).body.comments.length, 0);
  assert.equal((await call({ store })).body.comments.length, 1);
});
test("concurrent comments survive and retries never create duplicates", async () => {
  const store = memory(), id = randomUUID();
  const body = { id, page: "ilychicaaa", text: "First" };
  const results = await Promise.all([call({ method: "POST", store, body }), call({ method: "POST", store, body }), call({ method: "POST", role: "chicaaa", store, body: { ...body, id: randomUUID(), text: "Second" } })]);
  assert(results.every(result => result.code === 200 || result.code === 201));
  assert.equal(store.entries.size, 2);
  assert.equal((await call({ method: "POST", store, body })).code, 200);
  assert.equal(store.entries.size, 2);
});
test("saved comments cannot be changed or deleted", async () => {
  const store = memory(), body = { id: randomUUID(), page: "ilychicaaa", text: "Original" };
  await call({ method: "POST", store, body });
  assert.equal((await call({ method: "POST", store, body: { ...body, text: "Edited" } })).code, 409);
  for (const method of ["DELETE", "PUT", "PATCH"]) assert.equal((await call({ method, store, body })).code, 405);
  assert.equal([...store.entries.values()][0].text, "Original");
});
test("page keys, empty/oversized text, content type and origins are checked", async () => {
  for (const body of [{ id: randomUUID(), page: "../dates", text: "x" }, { id: randomUUID(), page: "ilychicaaa", text: "   " }, { id: randomUUID(), page: "ilychicaaa", text: "x".repeat(1201) }, { id: "../../x", page: "ilychicaaa", text: "x" }]) assert.equal((await call({ method: "POST", body })).code, 400);
  assert.equal((await call({ method: "POST", headers: { "content-type": "text/plain" } })).code, 415);
  assert.equal((await call({ headers: { origin: "https://evil.example" } })).code, 403);
  assert.equal((await call({ method: "OPTIONS", role: null, headers: { origin: "https://chica.keicodes.dev" } })).code, 204);
  assert.equal((await call({ headers: { origin: "https://chica.keicodes.dev" } })).headers["access-control-allow-origin"], "https://chica.keicodes.dev");
});
test("storage failures do not report a successful save", async () => {
  assert.equal((await call({ enabled: false })).code, 503);
  const store = memory(); store.append = async () => { throw new Error("Offline"); };
  assert.equal((await call({ method: "POST", store, body: { id: randomUUID(), page: "ilychicaaa", text: "Keep this draft" } })).code, 503);
});
test("all page and time threads are validated; malformed records stay out", () => {
  assert(sanitize({ id: randomUUID(), page: "oras-1212", text: "Good\u0000\r\nnight" }));
  assert.equal(sanitize({ id: randomUUID(), page: "oras-999", text: "x" }), null);
  assert.equal(safeComment({ id: randomUUID(), page: "date", author: "toString", text: "x", createdAt: 1 }, "date"), null);
  assert.equal(sanitize({ id: [randomUUID()], page: "date", text: "x" }), null);
  assert.equal(safeComment({ id: [randomUUID()], page: "date", author: "chico", text: "x", createdAt: 1 }, "date"), null);
  assert.equal(safeComment({ id: randomUUID(), page: "date", author: "chico", text: "x", createdAt: 1e30 }, "date"), null);
});
test("a malformed stored object cannot be overwritten", async () => {
  const store = memory(); store.read = async () => ({ invalid: true });
  const result = await call({ method: "POST", store, body: { id: randomUUID(), page: "ilychicaaa", text: "Keep draft" } });
  assert.equal(result.code, 409); assert.equal(store.entries.size, 0);
});
test("private object reads handle missing and corrupt objects without hiding transport errors", async () => {
  const sdk = { get: async (_key, options) => { assert.equal(options.access, "private"); assert.equal(options.useCache, false); return null; } };
  const store = createCommentStore(sdk);
  assert.equal(await store.read("library-comments/v1/date/missing.json"), null);
  sdk.get = async () => ({ statusCode: 200, stream: new Response("broken JSON").body });
  assert.deepEqual(await store.read("library-comments/v1/date/corrupt.json"), { invalid: true });
  sdk.get = async () => { throw new Error("Offline"); };
  await assert.rejects(store.read("library-comments/v1/date/network.json"), /Offline/);
});
