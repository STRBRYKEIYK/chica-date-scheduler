# Chica's Date Scheduler

Chico invites Chica on a date. She picks a vibe, a place (or her own), a day, a time and any extras, then taps "Send to Chico".

React, Tailwind CSS and Framer Motion on Vite, plus a few Vercel functions (alerts, saved dates, memories, calendar links).

## Run it

```
npm install
npm run dev
```

Open http://localhost:5173/date/ (the app uses the /date/ base). The alert only works when deployed on Vercel.

## Deploy

The app is served at `https://chica.keicodes.dev/date/`.

`chica.keicodes.dev` belongs to the kwento-natin project, so this one lives in its own Vercel project and kwento-natin forwards `/date/*` to it (see `vercel.json` in that repo).

1. Import this repo in Vercel (personal account). It detects Vite.
2. Project Settings > Deployment Protection: set Vercel Authentication to Disabled, otherwise kwento-natin cannot forward to it.
3. Add the environment variables from `.env.example` to this project.
4. If the project's `.vercel.app` hostname is not `chica-date-scheduler.vercel.app`, change it in kwento-natin's `vercel.json`.

The build output goes to `dist/date` and everything uses the `/date/` base. The form posts to `/date/api/send`, which `vercel.json` rewrites to `api/date.js`.

## Remembering the dates (Library calendar)

When Chica confirms a plan, the date is saved in her browser and sent to `/date/api/dates`, which keeps it in a Vercel Blob store. The Library page (`chica.keicodes.dev`) reads that list to put a pentel-pen heart on each date, on any phone or computer.

One-time setup, in the Vercel dashboard (personal account): this project > Storage > Create > Blob > choose **Private** > Connect to this project. That adds `BLOB_READ_WRITE_TOKEN`; redeploy once. If you pick a Public store instead, add `BLOB_ACCESS=public`. Until the store is connected the endpoint answers `enabled: false` and dates still show on the phone that set them.

### How a date is stored

`src/dates-core.js` holds the rules, shared by the page and the functions. The Library has its own copy of `slot`, `mergePair` and `mergeLists` in `menu/index.html` (kwento-natin), so change all three together.

- One entry per day + place, whichever plan id saved it. The newest copy wins; "sent" and the memory carry over.
- `status`: `confirmed`, `proposed` (Chico suggested it, Chica has not said yes) or `cancelled`. A cancel is kept as a small tombstone so it reaches every device and an old copy cannot bring the date back.
- `by`: `chica` or `chico`.
- `mem`: the memory added after the date (`{ note, photo, at }`). Only `/date/api/memory` writes it.

### Endpoints

| Path | Function | What |
| --- | --- | --- |
| `/date/api/send` | `api/date.js` | Alerts: kind `new`, `change`, `cancel`, `accept`, `decline` from `chica` or `chico`. |
| `/date/api/dates` | `api/dates.js` | GET lists the dates (cancelled ones too), POST saves or changes one. |
| `/date/api/memory` | `api/memory.js` | POST a note and/or a JPEG photo for a date that has already happened. |
| `/date/api/photo?k=` | `api/photo.js` | Streams a memory photo (private file, random name). |
| `/date/api/cal?id=&f=ics\|google` | `api/cal.js` | Opens a saved date in a calendar app, built by `src/calendar.js`. |

Five functions of the 12 the Hobby plan allows. Files starting with `_` are helpers, not functions.

`npm run build` first writes `public/places.json` (from `src/data.js`), which the Library calendar reads for highlights, budget and the what-to-bring list.

## Features

- **Plan:** four steps, each with a little panel of toggles and a big panel of choices (on a phone the toggles sit on top and can be folded). Vibe: pick one of six, or Surprise me, with budget and distance toggles. Place: the places of that vibe (or her own). Day and time: quick days (Bukas, Sabado, Linggo) and time-of-day toggles. Her say: idea chips for the note. The ticket shows a rough budget, a what-to-bring checklist, a map and directions.
- **Our dates:** see every saved date with a countdown, change it (day, time, place), cancel it, or save it to a calendar.
- **Chico mode:** open `https://chica.keicodes.dev/date/?as=chico` once on his phone. He plans, Chica gets the plan to answer (yes, change, or can't), and Keith's channels hear what she answers.
- **Library calendar:** tap a day for its details, the countdown to the next date or special day, and a memory (one photo and a few words) after a date.

Special days live in `specialsFor` in `menu/index.html`: the 6th of every month (monthsary, first one September 6, 2026), the anniversary on August 6, and Chica's birthday on September 2.

## Alerts

Pressing "Send to Chico" posts the plan to `/date/api/send`, which pings every channel that is switched on.

| Channel | Variables | Notes |
| --- | --- | --- |
| ntfy (push to your phone) | none, or `NTFY_TOPIC` | Works out of the box. The topic is derived from the Vercel project id (private), so it is not in this repo. Subscribe to it in the ntfy app. The push has an "Add to Google Calendar" button. |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Message includes the Google Calendar link. Add `TELEGRAM_CHICA_CHAT_ID` and Chica gets a confirmation too (she must press Start on the bot first). |
| Email (Resend) | `RESEND_API_KEY`, `NOTIFY_EMAIL` | `onboarding@resend.dev` only delivers to the Resend account's own email. |
| WhatsApp (CallMeBot) | `CALLMEBOT_APIKEY`, `NOTIFY_PHONE` | One-time activation with CallMeBot, free. |

`GET /date/api/send` reports which channels are on (no secrets) so a deploy can be checked.

The page only says "Sent to Chico!" if at least one channel confirms. Otherwise it points her to the WhatsApp and Share buttons.
Messenger cannot be pushed automatically (Meta requires an app review), so the Share button opens her phone's share sheet.

When Chico plans or changes a date, the alert is Chica's own message, so it needs `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHICA_CHAT_ID`. Without them the page says it could not reach her and offers the WhatsApp and Share buttons instead.

## Save the date

The ticket screen has "Google Calendar" and "Apple / Outlook" (.ics) buttons. Both create a 3-hour event in Philippine time, and the .ics adds reminders 1 day and 2 hours before.

## Edit the places

Categories and places live in `src/data.js`. Each place has a `zone` (how far from Rizal), a `budget` tier (1 to 3, a rough guess for two people without the fare) and optional `extra` checklist items; each category has its own checklist. Check the opening days of a new place before adding it.
