# Chica's Date Scheduler

Chico invites Chica on a date. She picks a vibe, a place (or her own), a day, a time and any extras, then taps "Send to Chico".

React, Tailwind CSS and Framer Motion on Vite, plus one Vercel function (`api/date.js`) that sends Keith an alert.

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

## Alerts

Pressing "Send to Chico" posts the plan to `/date/api/send`, which pings every channel that is switched on.

| Channel | Variables | Notes |
| --- | --- | --- |
| ntfy (push to your phone) | none, or `NTFY_TOPIC` | Works out of the box. The topic is derived from the Vercel project id (private), so it is not in this repo. Subscribe to it in the ntfy app. The push has an "Add to Google Calendar" button. |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Message includes the Google Calendar link. |
| Email (Resend) | `RESEND_API_KEY`, `NOTIFY_EMAIL` | `onboarding@resend.dev` only delivers to the Resend account's own email. |
| WhatsApp (CallMeBot) | `CALLMEBOT_APIKEY`, `NOTIFY_PHONE` | One-time activation with CallMeBot, free. |

`GET /date/api/send` reports which channels are on (no secrets) so a deploy can be checked.

The page only says "Sent to Chico!" if at least one channel confirms. Otherwise it points her to the WhatsApp and Share buttons.
Messenger cannot be pushed automatically (Meta requires an app review), so the Share button opens her phone's share sheet.

## Save the date

The ticket screen has "Google Calendar" and "Apple / Outlook" (.ics) buttons. Both create a 3-hour event in Philippine time, and the .ics adds reminders 1 day and 2 hours before.

## Edit the places

Categories and places live in `src/data.js`.
