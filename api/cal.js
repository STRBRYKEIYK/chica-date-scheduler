// Opens a saved date in a calendar app, from a plain link (the Library calendar uses it, so the event text is
// built in one place: src/calendar.js).
//   GET /date/api/cal?id=<date id>&f=ics     the .ics file (Apple, Outlook, any phone calendar), with alarms
//   GET /date/api/cal?id=<date id>&f=google  sends her to Google Calendar's "add event" page
import { enabled, blobIO } from "./_dates.js";
import { googleCalendarUrl, icsFile } from "../src/calendar.js";
import { isCancelled } from "../src/dates-core.js";

const ID = /^[A-Za-z0-9_-]{1,40}$/;

export default async function handler(req, res, io = blobIO) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "GET") { res.status(405).json({ ok: false }); return; }
  const q = req.query || {};
  const id = typeof q.id === "string" ? q.id : "";
  const f = q.f === "google" ? "google" : "ics";
  if (!ID.test(id) || !enabled()) { res.status(404).send("Hindi makita ang date."); return; }
  try {
    const cur = (await io.read()).find((x) => x && x.id === id);
    if (!cur || isCancelled(cur)) { res.status(404).send("Hindi makita ang date."); return; }
    const plan = { date: cur.date, time: cur.time, place: cur.place, area: cur.area, pid: cur.pid, note: cur.note, catTitle: cur.vibe };
    if (f === "google") {
      const url = googleCalendarUrl(plan);
      if (!url) { res.status(404).send("Walang oras ang date na ito."); return; }
      res.setHeader("location", url);
      res.status(302).end();
      return;
    }
    const ics = icsFile(plan);
    if (!ics) { res.status(404).send("Walang oras ang date na ito."); return; }
    res.setHeader("content-type", "text/calendar; charset=utf-8");
    res.setHeader("content-disposition", 'attachment; filename="Chico-and-Chica-date.ics"');
    res.status(200).send(ics);
  } catch (e) {
    console.error("cal failed:", e && e.name, e && e.message);
    res.status(500).send("May error. Subukan ulit.");
  }
}
