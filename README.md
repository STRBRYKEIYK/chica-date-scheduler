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

| Channel | Variables |
| --- | --- |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| Email (Resend) | `RESEND_API_KEY`, `NOTIFY_EMAIL` |
| WhatsApp (CallMeBot, optional) | `CALLMEBOT_APIKEY`, `NOTIFY_PHONE` |

The page only says "Sent to Chico!" if the function confirms an alert went out. Otherwise it points her to the WhatsApp button.

## Edit the places

Categories and places live in `src/data.js`.
