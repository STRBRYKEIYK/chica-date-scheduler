// Receives Chica's date plan and pings Keith. Free text comes from the request, so it is cleaned and capped.
import notify, { channels } from "./_notify.js";
import { googleCalendarUrl } from "../src/calendar.js";

const clean = (v, max) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max) : "";

export default async function handler(req, res) {
  // GET only reports which alert channels are switched on (no secrets), handy for checking a deploy.
  if (req.method === "GET") { res.status(200).json({ ok: true, channels: channels() }); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false }); return; }
  const b = req.body || {};
  const catTitle = clean(b.catTitle, 80);
  const place = clean(b.place, 140);
  const area = clean(b.area, 80);
  const date = clean(b.date, 10);
  const time = clean(b.time, 10);
  const note = clean(b.note, 800);
  const customPlace = b.customPlace === true;
  if (!place || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time) { res.status(400).json({ ok: false }); return; }

  const text = [
    "CHICA PICKED OUR DATE!",
    catTitle ? `Vibe: ${catTitle}` : "",
    `Place: ${place}${area ? ` (${area})` : ""}${customPlace ? " - HER OWN PICK" : ""}`,
    `When: ${date} at ${time}`,
    note ? `Her extras: ${note}` : ""
  ].filter(Boolean).join("\n");

  const calendarUrl = googleCalendarUrl({ catTitle, place, area, date, time, note });
  const out = await notify({ text, subject: `Chica picked a date: ${place}, ${date}`, calendarUrl });
  res.status(200).json(out);
}
