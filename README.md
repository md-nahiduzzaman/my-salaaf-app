# Work Ledger

Daily office check-in + task time tracking, with day/week/month text reports.
Built with Next.js (App Router) and a real Postgres database (Neon, via Vercel).
Design carried over 1:1 from the original artifact you liked — clean paper/ink
docket aesthetic, same colors and fonts.

---

## কী আছে এখানে (What's inside)

- **Check-in tracking** — log your office check-in time; check-out (in +9h) and
  effective hours (9h shift − 1.5h lunch = 7.5h) are calculated automatically.
- **Task ledger** — log "Start" / "Finish" per task; durations are computed by
  pairing them.
- **Reports** — Day / Week / Month views, shown as a table **and** as a
  ready-to-copy plain-text block (for pasting into a chat or email, like the
  monthly summaries we've drafted before).
- **Real database** — Postgres (via Neon, connected through Vercel), so data
  never disappears on redeploy. Tables auto-create on first use — no manual
  migration step.
- **Optional passcode gate** — since this will be a public URL, you can lock it
  behind a simple passcode (see below). Skips entirely if you don't set one.

---

## Deploy করার প্রসেস (Step by step)

### ১. Local এ dependencies install করুন

```bash
unzip work-ledger-app.zip
cd work-ledger-app
npm install
```

### ২. GitHub-এ push করুন

```bash
git init
git add .
git commit -m "Work Ledger v1"
gh repo create work-ledger --private --source=. --push
```
(অথবা GitHub-এ manually একটা নতুন repo বানিয়ে push করুন।)

### ৩. Vercel-এ import করুন

- [vercel.com/new](https://vercel.com/new) → এই GitHub repo সিলেক্ট করুন → **Deploy**।
- Framework auto-detect হবে (Next.js) — কোনো config বদলাতে হবে না।

### ৪. Database যোগ করুন (গুরুত্বপূর্ণ ধাপ)

- Deploy হয়ে গেলে project dashboard-এ যান → **Storage** ট্যাব।
- **Create Database** → **Postgres (Neon)** সিলেক্ট করুন → একটা নাম দিয়ে create করুন।
- **Connect to Project** ক্লিক করে এই project-এর সাথে link করুন — এতে `DATABASE_URL`
  environment variable automatically project-এ বসে যাবে।

### ৫. Redeploy করুন

- Env variable যোগ হওয়ার পর একটা নতুন deploy লাগবে যাতে সেটা effect করে —
  **Deployments** ট্যাব → সর্বশেষ deployment-এর `...` মেনু → **Redeploy**।

### ৬. App খুলুন

- আপনার `*.vercel.app` লিংকে যান। প্রথমবার কোনো API call হলেই টেবিল
  automatically তৈরি হয়ে যাবে — আলাদা কোনো migration command লাগবে না।

এতটুকুতেই কাজ শেষ। ✅

---

## Optional: Passcode protection

App-টা public URL-এ থাকবে বলে চাইলে একটা সহজ passcode gate যোগ করতে পারেন:

- Vercel project → **Settings → Environment Variables**
- নতুন variable: `APP_PASSCODE` = আপনার পছন্দের যেকোনো passcode
- Redeploy করুন

এটা সেট না করলে app পুরোপুরি open থাকবে (টেস্ট করার জন্য প্রথমে এভাবেই রাখতে পারেন)।

---

## Local development (optional)

```bash
npx vercel env pull .env.local   # Vercel থেকে DATABASE_URL টেনে আনবে
npm run dev
```

---

## Scaling this up later

Structured যাতে সহজে বাড়ানো যায়:

- `lib/config.js` — শিফট/লাঞ্চের সময় এক জায়গায়, বদলাতে চাইলে এখানেই বদলান।
- `lib/db.js` — schema এখানে; নতুন টেবিল/কলাম যোগ করা সহজ।
- একাধিক ব্যবহারকারী বা client (Salaaf/T2Devs আলাদা ট্র্যাক) দরকার হলে —
  `task_entries` টেবিলে একটা `project` কলাম যোগ করে filter করা যাবে।
- Multi-user/login দরকার হলে `APP_PASSCODE`-এর জায়গায় NextAuth বসানো যাবে,
  বাকি structure অপরিবর্তিত থাকবে।
- PDF/Excel এক্সপোর্ট চাইলে `/api/report`-এর `text` ফিল্ডের পাশে আরেকটা format
  (PDF buffer) রিটার্ন করা যোগ করা যাবে।

---

## Tech stack

- Next.js 16 (App Router, Route Handlers)
- `@neondatabase/serverless` — Postgres driver (Vercel's current recommended
  path; the older `@vercel/postgres` package is deprecated)
- No ORM — plain SQL via tagged templates, kept intentionally simple
- No CSS framework — hand-written CSS matching the original artifact design
