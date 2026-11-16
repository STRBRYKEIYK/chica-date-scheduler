# Chica's Date Scheduler

Chico invites Chica on a date. She picks a vibe, a place (or her own), a day, a time and any extras, then taps "Send to Chico".

React, Tailwind CSS and Framer Motion on Vite, plus one Vercel function (`api/date.js`) that sends Keith an alert.

## Run it

```
npm install
npm run dev
```

The alert only works when deployed on Vercel.

## Deploy

Import the repo in Vercel (it detects Vite) and add the domain `chica.keicodes.dev`.
Add the environment variables from `.env.example` to this project.

## Alerts

| Channel | Variables |
| --- | --- |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| Email (Resend) | `RESEND_API_KEY`, `NOTIFY_EMAIL` |
| WhatsApp (CallMeBot, optional) | `CALLMEBOT_APIKEY`, `NOTIFY_PHONE` |

The page only says "Sent to Chico!" if the function confirms an alert went out. Otherwise it points her to the WhatsApp button.

## Edit the places

Categories and places live in `src/data.js`.
