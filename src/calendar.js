// Calendar helpers shared by the page (Save the date) and the API route (alert link).
// Plans are in Philippine time. Manila is UTC+8 all year, so no daylight-saving math is needed.
const PH_OFFSET_HOURS = 8;
const HOURS = 3;

export function parseTime(t) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(t || "").trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return { h, min: Number(m[2]) };
}

export function eventWindow(date, time) {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  const t = parseTime(time);
  if (!dm || !t) return null;
  const start = new Date(Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), t.h - PH_OFFSET_HOURS, t.min));
  const end = new Date(start.getTime() + HOURS * 3600 * 1000);
  return { start, end };
}

const stamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function eventParts(plan) {
  const win = eventWindow(plan.date, plan.time);
  if (!win) return null;
  const title = "Date with Chico \u2764\uFE0F";
  const location = [plan.place, plan.area].filter(Boolean).join(", ");
  const details = [
    plan.catTitle ? `Vibe: ${plan.catTitle}` : "",
    `Place: ${location}`,
    plan.note && plan.note.trim() ? `Chica's extras: ${plan.note.trim()}` : "",
    "",
    "Chico + Chica. See you!"
  ].filter((l, i, a) => l !== "" || (i > 0 && a[i - 1] !== "")).join("\n");
  return { win, title, location, details };
}

export function googleCalendarUrl(plan) {
  const p = eventParts(plan);
  if (!p) return "";
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: p.title,
    dates: `${stamp(p.win.start)}/${stamp(p.win.end)}`,
    details: p.details,
    location: p.location
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// RFC 5545 asks for lines of at most 75 octets; fold on character boundaries well under that.
const fold = (line) => {
  const out = [];
  let rest = Array.from(line);
  while (rest.length > 60) { out.push(rest.slice(0, 60).join("")); rest = rest.slice(60); }
  out.push(rest.join(""));
  return out.join("\r\n ");
};

export function icsFile(plan) {
  const p = eventParts(plan);
  if (!p) return "";
  const uid = `date-${plan.date}-${p.win.start.getTime()}@chica.keicodes.dev`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chico and Chica//Date//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(p.win.start)}`,
    `DTEND:${stamp(p.win.end)}`,
    `SUMMARY:${esc(p.title)}`,
    `LOCATION:${esc(p.location)}`,
    `DESCRIPTION:${esc(p.details)}`,
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Our date is tomorrow, Chica!", "END:VALARM",
    "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:Our date starts in 2 hours!", "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
