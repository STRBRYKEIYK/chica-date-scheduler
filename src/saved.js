// Dates Chica has set are kept on her device so the calendar on the Library page (same origin, chica.keicodes.dev)
// can mark them with a heart. One entry per plan, keyed by a plan id that lives for one planning session.
const KEY = "chica.dates.v1";
const PLAN = "chica.plan";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function readDates() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export function planKey() {
  try {
    let id = sessionStorage.getItem(PLAN);
    if (!id) { id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); sessionStorage.setItem(PLAN, id); }
    return id;
  } catch {
    return "p" + Date.now().toString(36);
  }
}

export function forgetPlanKey() {
  try { sessionStorage.removeItem(PLAN); } catch { /* storage blocked */ }
}

// The same day at the same place is one date, whichever plan id (new tab, new session) saved it.
const slot = (x) => `${x.date}|${String(x.place || "").toLowerCase().replace(/\s+/g, " ").trim()}`;

function collapse(list) {
  const by = new Map();
  for (const x of list) {
    if (!x || typeof x !== "object" || typeof x.date !== "string") continue;
    const k = slot(x), c = by.get(k);
    if (!c) { by.set(k, x); continue; }
    const win = (x.savedAt || 0) >= (c.savedAt || 0) ? x : c;
    by.set(k, { ...win, sent: !!(x.sent || c.sent) });
  }
  return [...by.values()].sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
}

export function saveDate(id, sel, sent) {
  if (!ISO.test(sel.date || "")) return;
  const entry = {
    id, date: sel.date, time: sel.time || "", place: sel.place || "", area: sel.area || "",
    vibe: sel.catTitle || "", sent: !!sent
  };
  try {
    const all = readDates();
    // she already sent this date from another tab: it stays sent, and it stays one entry
    const before = all.some((x) => x && x.sent && typeof x.date === "string" && slot(x) === slot(entry));
    const rest = all.filter((x) => x && x.id !== id);
    rest.push({ ...entry, sent: entry.sent || before, savedAt: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(collapse(rest).slice(-40)));
  } catch { /* storage blocked, the plan itself still works */ }
  remember(entry);
}

// Also tell the server, so the calendar on any device (Chico's too) can show the heart. Best effort.
function remember(entry) {
  try {
    fetch(`${import.meta.env.BASE_URL}api/dates`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(entry), keepalive: true
    }).catch(() => {});
  } catch { /* offline or blocked, it is still saved on this device */ }
}
