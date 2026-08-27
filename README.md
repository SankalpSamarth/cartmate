# CartMate 🛒
> Split quick-commerce orders with your hostelmates. Save on delivery fees.

A mobile-first, real-time web app where students post Blinkit/Swiggy Instamart orders, others request to join, and you approve before sharing your WhatsApp — so your number never gets exposed to a crowd.

---

## Deploy to Vercel (5 minutes)

### Step 1 — Create your Upstash Redis database
1. Go to [console.upstash.com](https://console.upstash.com) and sign up (free)
2. Click **Create Database** → give it any name → select the region closest to your users (e.g. **Mumbai** for India)
3. Once created, go to the **REST API** tab and copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Step 2 — Deploy to Vercel
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. In **Environment Variables**, add:
   ```
   UPSTASH_REDIS_REST_URL = <paste from Upstash>
   UPSTASH_REDIS_REST_TOKEN = <paste from Upstash>
   VAPID_PUBLIC_KEY = <generated public key>
   VAPID_PRIVATE_KEY = <generated private key>
   VAPID_SUBJECT = https://cartmate-ten.vercel.app/
   ```
   Generate the VAPID key pair once with `npx web-push generate-vapid-keys --json`.
4. Click **Deploy** — done!

---

## Customize for your campus

Edit [`lib/constants.ts`](./lib/constants.ts):

```ts
export const HOSTELS = [
  "HB4 - C Wing",
  "HB4 - D Wing",
  // Add your actual hostel/building names here
];

export const PLATFORMS = [
  "Blinkit",
  "Swiggy Instamart",
] as const;
```

---

## Local Development

```bash
npm install
npm run dev
```

The app runs fully in-memory without Upstash configured. For production-like local testing, copy `.env.local.example` to `.env.local` and fill in your Upstash credentials.

---

## How it works

1. **Post** — You're about to order. Post it publicly (platform, hostel, what you need, WhatsApp number, expiry timer).
2. **Request** — Someone sees your post and clicks "I want in". They describe what they'd order.
3. **Approve** — You see requests in-app and pick who joins. No WhatsApp flood.
4. **Connect** — Only the approved person sees the "Join on WhatsApp" button. Your number stays private until you choose.
5. **Auto-expire** — Posts vanish after 10–20 minutes automatically.
6. **Notify** — Students can opt into hostel-specific order alerts; posters and requesters receive request-status notifications.
7. **Share** — Every new post gets a WhatsApp-ready hostel link immediately after publishing.

---

## Tech Stack

- **Next.js 16** (App Router, server components)
- **Upstash Redis** (serverless key-value store with auto-TTL)
- **Vanilla CSS** (no Tailwind utility classes in markup)
- **BroadcastChannel + 3s polling** (real-time sync across tabs and incognito windows)
- **localStorage** (device identity — no login required)
- **Web Push + service worker** (hostel order, join-request, and approval alerts)
- **Vercel Analytics events** (privacy-safe conversion funnel)
