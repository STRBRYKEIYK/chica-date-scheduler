// Receives what Chica or Chico just did with a date and tells the other one. Free text comes from the request,
// so it is cleaned and capped.
//
// kind   "new" (default) | "change" | "cancel" | "accept" | "decline"
// actor  "chica" (default): pings Keith's channels.  "chico": sends Chica her bot message instead.
import notify, { channels } from "./_notify.js";
import { googleCalendarUrl } from "../src/calendar.js";

const clean = (v, max) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max) : "";

const KINDS = ["new", "change", "cancel", "accept", "decline"];
const SITE = "https://chica.keicodes.dev/date/?open=dates";

const day = (iso) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : iso;
const spot = (place, area) => `${place}${area ? ` (${area})` : ""}`;

// The message for Keith (English, like the first alert) and the one for Chica (her ALL-CAPS Taglish).
export function messages({ kind, actor, p, from }) {
  const when = `${p.date} at ${p.time}`;
  const was = from ? `\nBefore: ${spot(from.place, from.area)}, ${from.date} at ${from.time}` : "";
  const extras = p.note ? `\nExtras: ${p.note}` : "";
  const plan = `Place: ${spot(p.place, p.area)}${p.customPlace ? " - HER OWN PICK" : ""}\nWhen: ${when}${extras}`;
  const up = (s) => s.toUpperCase();
  const planC = up(`LUGAR: ${spot(p.place, p.area)}\nARAW: ${day(p.date)}\nORAS: ${p.time}${p.note ? `\nIDINAGDAG: ${p.note}` : ""}`);
  const sign = " - CHICO ❤️";

  if (actor === "chico") {
    const head = {
      new: "MAY PLANO SI CHICO PARA SA ATIN, MI CHICA! \u{1F970}",
      change: "BINAGO NI CHICO ANG PLANO NATIN, MI CHICA!",
      cancel: "HINDI NA MATUTULOY ANG DATE NA ITO. PUMILI TAYO NG BAGO, MI CHICA!"
    }[kind];
    if (!head) return null;
    const open = kind === "cancel" ? "" : `\n\nSAGUTIN MO DITO:\n${SITE}`;
    return {
      title: kind === "cancel" ? "Chico cancelled a date" : "Chico planned a date",
      subject: `Chico ${kind === "cancel" ? "cancelled" : "planned"}: ${p.place}, ${p.date}`,
      text: `YOU ${kind === "cancel" ? "CANCELLED" : "PLANNED"} A DATE FOR CHICA\n${plan}`,
      chicaText: `${head}\n\n${planC}${open}\n${sign.trim()}`
    };
  }

  const t = {
    new: ["CHICA PICKED OUR DATE!", "Chica picked our date!", `${p.vibe ? `Vibe: ${p.vibe}\n` : ""}${plan}`],
    change: ["CHICA CHANGED OUR DATE!", "Chica changed our date", `${plan}${was}`],
    cancel: ["CHICA CANCELLED A DATE. PICK A NEW ONE TOGETHER!", "Chica cancelled a date", plan],
    accept: ["CHICA SAID YES TO YOUR PLAN!", "Chica said yes!", plan],
    decline: ["CHICA NEEDS ANOTHER DAY FOR THIS ONE. PICK A NEW ONE TOGETHER!", "Chica needs another day", plan]
  }[kind];
  return {
    title: t[1],
    subject: `${t[1]}: ${p.place}, ${p.date}`,
    text: `${t[0]}\n${t[2]}`,
    chicaText: kind === "new" ? `DATE NATIN, ASAWA KO! \u{1F970}\n\n${planC}\n\nABANGAN KITA SA ARAW NA YAN, MI CHICA.${sign}` : ""
  };
}

export default async function handler(req, res) {
  // GET only reports which alert channels are switched on (no secrets), handy for checking a deploy.
  if (req.method === "GET") { res.status(200).json({ ok: true, channels: channels() }); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false }); return; }
  const b = req.body || {};
  const kind = KINDS.includes(b.kind) ? b.kind : "new";
  const actor = b.actor === "chico" ? "chico" : "chica";
  const p = {
    vibe: clean(b.catTitle, 80), place: clean(b.place, 140), area: clean(b.area, 80),
    date: clean(b.date, 10), time: clean(b.time, 10), note: clean(b.note, 800), customPlace: b.customPlace === true
  };
  if (!p.place || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !p.time) { res.status(400).json({ ok: false }); return; }
  const f = b.from && typeof b.from === "object" ? b.from : null;
  const from = f && clean(f.place, 140) ? { place: clean(f.place, 140), area: clean(f.area, 80), date: clean(f.date, 10), time: clean(f.time, 10) } : null;

  const m = messages({ kind, actor, p, from });
  if (!m) { res.status(400).json({ ok: false }); return; }
  const calendarUrl = kind === "cancel" || kind === "decline" ? "" : googleCalendarUrl({ catTitle: p.vibe, place: p.place, area: p.area, date: p.date, time: p.time, note: p.note });
  const out = await notify({ text: m.text, subject: m.subject, title: m.title, calendarUrl, chicaText: m.chicaText, to: actor === "chico" ? "chica" : "keith" });
  res.status(200).json(out);
}
