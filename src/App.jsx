import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { CATEGORIES, TIMES } from "./data.js";
import { PHOTOS } from "./photos.js";

const STEPS = ["Vibe", "Place", "Date & time", "Your say"];
const EMPTY = { catId: "", catTitle: "", place: "", area: "", customPlace: false, date: "", time: "", note: "" };
const LABEL = "text-[10px] font-bold uppercase tracking-[0.28em]";

/* ---------- helpers ---------- */
const parseISO = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toISO = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const prettyDate = (iso) =>
  iso ? parseISO(iso).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "";

const enc = (p) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(p))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const dec = (s) => {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    if (!p || typeof p !== "object") return null;
    const out = { ...EMPTY };
    for (const k of Object.keys(EMPTY)) {
      if (k === "customPlace") out[k] = p[k] === true;
      else if (typeof p[k] === "string") out[k] = p[k].slice(0, k === "note" ? 800 : 140);
    }
    return out.place && /^\d{4}-\d{2}-\d{2}$/.test(out.date) && out.time ? out : null;
  } catch {
    return null;
  }
};

const isCustomPlan = (s) => s.customPlace || s.note.trim().length > 0;

const planText = (s) =>
  [
    "CHICOOO! HERE'S OUR DATE PLAN 🥰",
    `Vibe: ${s.catTitle}`,
    `Place: ${s.place}${s.area ? ` (${s.area})` : ""}${s.customPlace ? " - my own pick!" : ""}`,
    `When: ${prettyDate(s.date)} at ${s.time}`,
    s.note.trim() ? `My extras: ${s.note.trim()}` : ""
  ].filter(Boolean).join("\n");

/* ---------- small marks ---------- */
const Heart = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);
const Arrow = ({ className = "h-4 w-4", flip = false }) => (
  <svg viewBox="0 0 24 24" className={`${className} ${flip ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);
const Tick = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

const variants = {
  enter: (d) => ({ opacity: 0, x: d > 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (d) => ({ opacity: 0, x: d > 0 ? -28 : 28 })
};

/* ---------- welcome ---------- */
function Ticker() {
  const unit = (k) => (
    <span key={k} className="flex shrink-0 items-center gap-5 pr-5">
      {["Chico", "Chica", "3:33 PM", "Date night", "Admit two"].map((t) => (
        <span key={t} className="flex items-center gap-5">
          <span>{t}</span>
          <Heart className="h-2.5 w-2.5" />
        </span>
      ))}
    </span>
  );
  return (
    <div className="overflow-hidden bg-red py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-white" aria-hidden="true">
      <div className="flex w-max animate-marquee motion-reduce:animate-none">{[0, 1, 2, 3].map(unit)}</div>
    </div>
  );
}

function Welcome({ onStart }) {
  return (
    <div className="min-h-dvh bg-ink text-paper">
      <Ticker />
      <div className="mx-auto flex min-h-[calc(100dvh-34px)] max-w-xl flex-col px-6 pb-10 pt-6">
        <div className={`${LABEL} flex justify-between text-paper/55`}>
          <span>3:33 PM</span>
          <span>11.16.2026</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
          className="relative mx-auto mt-7 w-[86%] max-w-sm"
        >
          <div className="print absolute -right-3 top-3 w-[62%] rotate-[5deg]">
            <div className="aspect-[4/3]"><img src={PHOTOS.b5} alt="" loading="eager" decoding="async" /></div>
          </div>
          <div className="print relative w-[72%] -rotate-[3deg]">
            <div className="aspect-[4/3]"><img src={PHOTOS.b3} alt="Chico and Chica in matching sunglasses" loading="eager" decoding="async" /></div>
            <p className="absolute inset-x-0 bottom-1.5 text-center text-[8px] font-bold uppercase tracking-[0.3em] text-mute">Nos. 1116 &middot; 0333</p>
          </div>
          <span className="absolute -bottom-2 -right-1 rotate-[-4deg] border-[1.5px] border-red-lt bg-ink px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.28em] text-red-lt">
            Admit two
          </span>
        </motion.div>

        <div className="mt-auto pt-10">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className={`${LABEL} text-red-lt`}>
            Isang imbitasyon
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }}
            className="mt-4 font-display text-[3.2rem] font-black italic leading-[0.94] sm:text-7xl"
          >
            Chico invites <span className="text-red-lt">Chica</span> on a date.
            <Heart className="ml-2 inline-block h-[0.4em] w-[0.4em] align-[0.1em] text-red-lt" />
          </motion.h1>

          <motion.dl initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 border-t-[1.5px] border-paper">
            {[["Para kay", "Chicaaaaa ko"], ["Mula kay", "Chicooo mo"], ["Ikaw ang pipili", "Lugar, araw, oras"]].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[116px_1fr] gap-3 border-b border-paper/20 py-3">
                <dt className={`${LABEL} pt-0.5 text-red-lt`}>{k}</dt>
                <dd className="text-[15px] font-medium uppercase tracking-wide">{v}</dd>
              </div>
            ))}
          </motion.dl>

          <motion.button
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
            whileTap={{ scale: 0.97 }} onClick={onStart}
            className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-red px-8 text-[12px] font-bold uppercase tracking-[0.2em] text-white"
          >
            Open invitation <Arrow />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ---------- step chrome ---------- */
function Header({ step, onBack }) {
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className={`${LABEL} -ml-1 inline-flex min-h-11 items-center gap-2 pr-3 text-ink`}>
          <Arrow flip /> Back
        </button>
        <p className={`${LABEL} text-mute`}>{`0${step} / 04`} · {STEPS[step - 1]}</p>
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {STEPS.map((_, i) => (
          <span key={i} className={`h-[3px] flex-1 transition-colors duration-300 ${i < step ? "bg-red" : "bg-line"}`} />
        ))}
      </div>
    </header>
  );
}

function Title({ eyebrow, children, sub, photo, tilt = 4 }) {
  return (
    <div className="relative mb-7">
      {photo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: 0 }} animate={{ opacity: 1, scale: 1, rotate: tilt }} transition={{ delay: 0.15, duration: 0.5 }}
          className="print absolute right-0 top-0 w-[88px]" aria-hidden="true"
        >
          <div className="aspect-square"><img src={photo} alt="" loading="lazy" decoding="async" /></div>
        </motion.div>
      )}
      <p className={`${LABEL} text-red`}>{eyebrow}</p>
      <h2 className={`mt-2 font-display text-[2.6rem] font-black italic leading-[1.02] ${photo ? "pr-24" : ""}`}>{children}</h2>
      {sub && <p className="mt-3 max-w-[34ch] text-[13px] font-medium uppercase leading-relaxed tracking-wide text-mute">{sub}</p>}
    </div>
  );
}

/* a ticket-style row: dashed stub on the left, content on the right */
function TicketRow({ mark, label, active, onClick, children, delay = 0 }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      whileTap={{ scale: 0.985 }} onClick={onClick} aria-pressed={active}
      className={`relative grid w-full grid-cols-[68px_1fr] overflow-hidden rounded-lg border-[1.5px] bg-card text-left transition-colors ${active ? "border-red" : "border-ink"}`}
    >
      <span className={`flex flex-col items-center justify-between gap-3 border-r-2 border-dashed px-1 py-4 ${active ? "border-red" : "border-ink"}`}>
        <span className={`${LABEL} text-[8px] tracking-[0.3em] text-red [writing-mode:vertical-rl] rotate-180`}>{label}</span>
        <span className={`font-display text-[2.6rem] font-black leading-none ${active ? "text-red" : "text-ink"}`}>{mark}</span>
      </span>
      <span className="min-w-0 p-4 pr-5">{children}</span>
      {active && (
        <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-red text-white"><Tick className="h-3.5 w-3.5" /></span>
      )}
    </motion.button>
  );
}

function CategoryStep({ sel, onPick }) {
  return (
    <>
      <Title eyebrow="Step one" sub="What kind of date are we feeling?" photo={PHOTOS.b1} tilt={4}>Pick the vibe</Title>
      <div className="grid gap-4">
        {CATEGORIES.map((c, i) => (
          <TicketRow key={c.id} mark={i + 1} label="Vibe" active={sel.catId === c.id} onClick={() => onPick(c)} delay={0.05 * i}>
            <span className="block pr-6 font-display text-[1.3rem] font-black leading-tight">{c.title}</span>
            <span className="mt-1.5 block text-[12px] font-medium uppercase leading-relaxed tracking-wide text-mute">{c.vibe}</span>
            <span className={`${LABEL} mt-3 block text-red`}>
              {c.places.length} {c.places.length === 1 ? "place" : "places"} + your own pick
            </span>
          </TicketRow>
        ))}
      </div>
    </>
  );
}

function PlaceStep({ sel, patch }) {
  const cat = CATEGORIES.find((c) => c.id === sel.catId);
  const [custom, setCustom] = useState(sel.customPlace);
  if (!cat) return null;

  const pick = (p) => { setCustom(false); patch({ place: p.name, area: p.area, customPlace: false }); };
  const openCustom = () => { setCustom(true); patch({ place: "", area: "", customPlace: true }); };

  return (
    <>
      <Title eyebrow="Step two" sub={cat.vibe} photo={PHOTOS.b2} tilt={-4}>Set the scene</Title>
      <p className="mb-4 font-display text-lg font-bold italic">{cat.title}</p>
      <div className="grid gap-4" role="group" aria-label="Choose a place">
        {cat.places.map((p, i) => (
          <TicketRow key={p.id} mark={"ABC"[i]} label="Place" active={!custom && sel.place === p.name} onClick={() => pick(p)} delay={0.05 * i}>
            <span className="block pr-6 font-display text-[1.3rem] font-black leading-tight">{p.name}</span>
            <span className={`${LABEL} mt-1.5 block text-mute`}>{p.area}</span>
            <span className="mt-3 block text-[12.5px] font-medium uppercase leading-relaxed tracking-wide text-ink/80">
              {p.highlights.join("  ·  ")}
            </span>
          </TicketRow>
        ))}

        <motion.div
          layout
          className={`rounded-lg border-[1.5px] border-dashed p-5 ${custom ? "border-red bg-card" : "border-ink bg-transparent"}`}
        >
          <button onClick={openCustom} aria-expanded={custom} className="block w-full text-left">
            <span className={`${LABEL} block text-red`}>Option D · Chica's pick</span>
            <span className="mt-1 block font-display text-[1.3rem] font-black leading-tight">I have another place in mind!</span>
          </button>
          <AnimatePresence initial={false}>
            {custom && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <label htmlFor="custom-place" className={`${LABEL} mb-1 mt-6 block text-mute`}>Where to, Chica?</label>
                <input
                  id="custom-place" autoFocus maxLength={120} value={sel.place}
                  onChange={(e) => patch({ place: e.target.value, area: "", customPlace: true })}
                  placeholder="A cafe, a beach, a secret spot"
                  className="w-full border-0 border-b-2 border-ink bg-transparent pb-2 pt-1 font-display text-2xl font-bold italic placeholder:font-normal placeholder:text-mute/50 focus:border-red focus:outline-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}

function Calendar({ value, onChange }) {
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const [view, setView] = useState(() => {
    const b = value ? parseISO(value) : today;
    return new Date(b.getFullYear(), b.getMonth(), 1);
  });
  const minView = new Date(today.getFullYear(), today.getMonth(), 1);
  const maxView = new Date(today.getFullYear(), today.getMonth() + 12, 1);
  const y = view.getFullYear();
  const m = view.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(view.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const shift = (n) => setView(new Date(y, m + n, 1));

  return (
    <div className="rounded-lg border-[1.5px] border-ink bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => shift(-1)} disabled={view <= minView} aria-label="Previous month" className="grid h-11 w-11 place-items-center disabled:opacity-20"><Arrow flip /></button>
        <p className="font-display text-xl font-black" aria-live="polite">{view.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        <button onClick={() => shift(1)} disabled={view >= maxView} aria-label="Next month" className="grid h-11 w-11 place-items-center disabled:opacity-20"><Arrow /></button>
      </div>
      <div className={`${LABEL} grid grid-cols-7 border-b border-line pb-2 text-center text-mute`}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`b${i}`} />;
          const iso = toISO(y, m, d);
          const past = new Date(y, m, d) < today;
          const on = value === iso;
          const isToday = new Date(y, m, d).getTime() === today.getTime();
          return (
            <button
              key={iso} disabled={past} onClick={() => onChange(iso)} aria-pressed={on} aria-label={prettyDate(iso)}
              className={`mx-auto grid h-11 w-11 place-items-center rounded-full text-[15px] font-bold transition-colors ${
                on ? "bg-red text-white" : past ? "text-ink/25" : "hover:bg-paper"
              } ${isToday && !on ? "underline decoration-red decoration-2 underline-offset-4" : ""}`}
            >{d}</button>
          );
        })}
      </div>
    </div>
  );
}

function WhenStep({ sel, patch }) {
  return (
    <>
      <Title eyebrow="Step three" sub={sel.place ? `Our date at ${sel.place}.` : "Choose a day that works for you."} photo={PHOTOS.b4} tilt={4}>Lock in the time</Title>
      <div className="grid gap-5">
        <Calendar value={sel.date} onChange={(date) => patch({ date })} />
        <div>
          <label htmlFor="time" className={`${LABEL} mb-2 block text-mute`}>What time, Chica?</label>
          <div className="relative">
            <select
              id="time" value={sel.time} onChange={(e) => patch({ time: e.target.value })}
              className="min-h-14 w-full appearance-none rounded-lg border-[1.5px] border-ink bg-card px-4 pr-12 text-lg font-bold focus:border-red focus:outline-none"
            >
              <option value="">Choose a time</option>
              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </div>
        {sel.date && (
          <p className={`${LABEL} rounded-lg bg-ink px-4 py-4 leading-relaxed tracking-[0.18em] text-paper`}>
            {prettyDate(sel.date)}{sel.time ? ` · ${sel.time}` : ""}
          </p>
        )}
      </div>
    </>
  );
}

function NoteStep({ sel, patch }) {
  return (
    <>
      <Title eyebrow="Step four" sub="Totally optional. Your idea always counts." photo={PHOTOS.b6} tilt={-4}>Your say</Title>
      <div className="rounded-lg border-[1.5px] border-ink bg-card p-5">
        <label htmlFor="note" className="block font-display text-xl font-black italic leading-snug">
          Anything else you want to add, change, or do on this date, Chica?
        </label>
        <textarea
          id="note" rows={8} maxLength={800} value={sel.note} onChange={(e) => patch({ note: e.target.value })}
          placeholder="Extra stops, foods to try, a different mood, a surprise for me"
          className="ruled mt-3 w-full resize-none border-0 bg-transparent p-0 text-lg font-medium placeholder:text-mute/50 focus:outline-none"
        />
        <p className={`${LABEL} mt-2 text-right text-mute`}>{sel.note.length} / 800</p>
      </div>
    </>
  );
}

/* ---------- confirmation ticket ---------- */
function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-3 border-b border-line py-3.5 last:border-b-0">
      <dt className={`${LABEL} pt-1 text-red`}>{label}</dt>
      <dd className="min-w-0 break-words text-[17px] font-bold leading-snug">{children}</dd>
    </div>
  );
}

const CONFETTI_COLORS = ["#c8102e", "#ff4b63", "#f3f3f0", "#c8102e", "#fdfdfb"];
function Confetti() {
  const bits = useMemo(
    () => Array.from({ length: 44 }, (_, i) => {
      const r = (a, b) => a + Math.random() * (b - a);
      return { i, x: r(-170, 170), up: r(150, 330), fall: r(60, 260), rot: r(-540, 540), w: r(5, 9), h: r(9, 16), d: r(0, 0.12), t: r(1.5, 2.3), c: CONFETTI_COLORS[i % CONFETTI_COLORS.length] };
    }),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {bits.map((b) => (
        <motion.span
          key={b.i}
          className="absolute left-1/2 top-[62%] block"
          style={{ width: b.w, height: b.h, background: b.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: b.x, y: [0, -b.up, b.fall], opacity: [1, 1, 0], rotate: b.rot }}
          transition={{ duration: b.t, delay: b.d, ease: "easeOut", times: [0, 0.42, 1] }}
        />
      ))}
    </div>
  );
}

function Confirm({ sel, onRestart, onEdit }) {
  const [status, setStatus] = useState("idle");
  const [boom, setBoom] = useState(false);
  useEffect(() => {
    if (status !== "sent") return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setBoom(true);
    const t = setTimeout(() => setBoom(false), 2800);
    return () => clearTimeout(t);
  }, [status]);
  const [copied, setCopied] = useState("");
  const custom = isCustomPlan(sel);
  const text = planText(sel);
  const link = `${location.origin}${location.pathname}#p=${enc(sel)}`;

  const send = async () => {
    setStatus("sending");
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}api/send`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sel) });
      const j = r.ok ? await r.json() : null;
      setStatus(j && j.ok === true ? "sent" : "fail");
    } catch {
      setStatus("fail");
    }
  };
  const copy = async (what, value) => {
    try { await navigator.clipboard.writeText(value); setCopied(what); setTimeout(() => setCopied(""), 1800); }
    catch { setCopied("manual"); }
  };

  return (
    <div className="min-h-dvh bg-ink text-paper">
      {boom && <Confetti />}
      <div className="mx-auto max-w-xl px-6 pb-14 pt-6">
        <button onClick={onEdit} className={`${LABEL} -ml-1 inline-flex min-h-11 items-center gap-2 pr-3`}><Arrow flip /> Change something</button>
        <p className={`${LABEL} mt-6 text-red-lt`}>Pasok na, asawa ko</p>
        <h2 className="mt-2 font-display text-[2.6rem] font-black italic leading-[1.02]">Here's our plan, Chica.</h2>

        <motion.article
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mt-8 rounded-lg bg-card text-ink" aria-label="Date itinerary ticket"
        >
          <div className="flex items-start justify-between gap-3 border-b-[1.5px] border-ink px-5 pb-4 pt-5">
            <div>
              <p className={`${LABEL} text-mute`}>Date ticket · admit two</p>
              <p className="mt-1 font-display text-[2rem] font-black italic leading-none">Chico + Chica</p>
              {custom && (
                <span className={`${LABEL} mt-3 inline-block -rotate-2 border-2 border-red px-2.5 py-1.5 text-red`}>Chica's custom plan</span>
              )}
            </div>
            <Heart className="mt-1 h-6 w-6 shrink-0 text-red" />
          </div>
          <div className="grid grid-cols-3 gap-[3px] border-b-[1.5px] border-ink bg-ink" aria-hidden="true">
            {[PHOTOS.b2, PHOTOS.b3, PHOTOS.b6].map((src, i) => (
              <div key={i} className="aspect-[4/3] overflow-hidden bg-line">
                <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover grayscale" />
              </div>
            ))}
          </div>
          <dl className="px-5 pb-2 pt-1">
            <Row label="Vibe">{sel.catTitle}</Row>
            <Row label={sel.customPlace ? "Chica's pick" : "Place"}>
              {sel.place}
              {sel.area && <span className="mt-0.5 block text-[13px] font-medium uppercase tracking-wide text-mute">{sel.area}</span>}
            </Row>
            <Row label="Day">{prettyDate(sel.date)}</Row>
            <Row label="Time">{sel.time}</Row>
            {sel.note.trim() && <Row label="Her extras"><span className="whitespace-pre-wrap font-medium">{sel.note.trim()}</span></Row>}
          </dl>
          <div className="notch mt-2 flex items-center justify-between gap-4 border-t-2 border-dashed border-ink/70 px-5 py-4">
            <span className="bars h-6 w-24 shrink-0" aria-hidden="true" />
            <span className={`${LABEL} text-right text-mute`}>No. 1116 · 0333<br />With love, Chico</span>
          </div>
        </motion.article>

        <div className="mt-8 grid gap-3">
          <button
            onClick={send} disabled={status === "sending" || status === "sent"}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-red px-6 text-[12px] font-bold uppercase tracking-[0.2em] text-white disabled:opacity-90"
          >
            {status === "sent" ? <><Tick /> Sent to Chico</> : status === "sending" ? "Sending..." : <>Send to Chico <Arrow /></>}
          </button>
          <p role="status" className="min-h-6 text-center text-[12px] font-medium uppercase leading-relaxed tracking-wide text-paper/80">
            {status === "sent" && "Nakarating na kay Chico ang plano mo."}
            {status === "fail" && "Di ko nasend nang automatic. Gamitin ang WhatsApp sa baba."}
            {copied === "manual" && "Di ma-copy dito. Pindutin nang matagal ang text para kopyahin."}
          </p>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener"
            className="inline-flex min-h-14 items-center justify-center rounded-full border-[1.5px] border-paper/50 px-6 text-[12px] font-bold uppercase tracking-[0.2em]"
          >Send on WhatsApp</a>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => copy("plan", text)} className="min-h-12 rounded-full border border-paper/25 px-4 text-[11px] font-bold uppercase tracking-[0.2em]">{copied === "plan" ? "Copied" : "Copy plan"}</button>
            <button onClick={() => copy("link", link)} className="min-h-12 rounded-full border border-paper/25 px-4 text-[11px] font-bold uppercase tracking-[0.2em]">{copied === "link" ? "Copied" : "Copy link"}</button>
          </div>
          <button onClick={onRestart} className={`${LABEL} mt-2 min-h-11 text-red-lt underline underline-offset-4`}>Plan a different date</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- app ---------- */
export default function App() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [sel, setSel] = useState(EMPTY);
  const patch = (o) => setSel((s) => ({ ...s, ...o }));
  const go = (n) => { setDir(n > step ? 1 : -1); setStep(n); window.scrollTo(0, 0); };

  useEffect(() => {
    const m = /^#p=(.+)$/.exec(location.hash);
    if (m) {
      const p = dec(m[1]);
      if (p) { setSel(p); setStep(5); }
    }
  }, []);

  const canNext =
    (step === 2 && sel.place.trim().length >= 2) ||
    (step === 3 && !!sel.date && !!sel.time) ||
    step === 4;

  const hint =
    step === 2 && !canNext ? "Pick a place to continue" :
    step === 3 && !canNext ? (!sel.date ? "Pick a day to continue" : "Pick a time to continue") : "";

  const pickCategory = (c) => {
    if (sel.catId !== c.id) patch({ catId: c.id, catTitle: c.title, place: "", area: "", customPlace: false });
    go(2);
  };

  let body;
  if (step === 0) body = <Welcome onStart={() => go(1)} />;
  else if (step === 5) body = <Confirm sel={sel} onEdit={() => go(4)} onRestart={() => { history.replaceState(null, "", location.pathname); setSel(EMPTY); go(1); }} />;
  else {
    body = (
      <div className="min-h-dvh bg-paper text-ink">
        <div className="mx-auto w-full max-w-xl px-6 pb-44 pt-4">
          <Header step={step} onBack={() => go(step - 1)} />
          {step === 1 && <CategoryStep sel={sel} onPick={pickCategory} />}
          {step === 2 && <PlaceStep sel={sel} patch={patch} />}
          {step === 3 && <WhenStep sel={sel} patch={patch} />}
          {step === 4 && <NoteStep sel={sel} patch={patch} />}
        </div>
        {step >= 2 && (
          <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper px-6 pb-6 pt-3">
            <div className="mx-auto max-w-xl">
              <p className={`${LABEL} mb-2 min-h-4 text-center text-mute`} role="status">{hint}</p>
              <button
                onClick={() => go(step + 1)} disabled={!canNext}
                className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-red px-6 text-[12px] font-bold uppercase tracking-[0.2em] text-white transition-opacity disabled:opacity-30"
              >
                {step === 4 ? "See our plan" : "Continue"} <Arrow />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.24, ease: "easeOut" }}>
          {body}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
