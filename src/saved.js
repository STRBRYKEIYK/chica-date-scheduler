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

export function saveDate(id, sel, sent) {
  if (!ISO.test(sel.date || "")) return;
  try {
    const rest = readDates().filter((x) => x && x.id !== id);
    rest.push({
      id, date: sel.date, time: sel.time || "", place: sel.place || "", area: sel.area || "",
      vibe: sel.catTitle || "", sent: !!sent, savedAt: Date.now()
    });
    localStorage.setItem(KEY, JSON.stringify(rest.slice(-40)));
  } catch { /* storage blocked, the plan itself still works */ }
}
