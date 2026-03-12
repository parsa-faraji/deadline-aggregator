# Deadline Aggregator — Deep Dive & Readiness Report

## Executive summary

The app is a **Next.js 16** student deadline aggregator that pulls from **Google Calendar**, **Canvas**, **Gmail**, **Gradescope**, and **Ed Discussion**, with a **dashboard**, **calendar**, **tasks**, **study planner**, and **notifications**. Most of the core flow is implemented; the main gaps are **configuration** (env + DB), **documentation**, **Gradescope/Ed in cron** (fixed), **Settings UI for Gradescope** (added), and **UX/value** improvements (see below).

**Build status:** ✅ `npm run build` succeeds.

---

## 1. What’s implemented and working

### Auth & core stack
- **NextAuth v5** with Google (Calendar + Gmail scopes), Prisma adapter, session with `user.id`.
- **Prisma + Neon** serverless Postgres; schema covers users, accounts, sessions, integrations, deadlines, tasks, study sessions, notification prefs, push subs, notification logs.
- **DB layer** (`src/lib/db.ts`) uses Neon serverless adapter.

### Integrations (sync logic)
| Source            | Status | Notes |
|-------------------|--------|--------|
| **Google Calendar** | ✅ | OAuth token from Google sign-in; primary calendar, 90-day window. |
| **Gmail**         | ✅ | OAuth; search for deadline keywords, regex date extraction; items stored as `suggested: true`. |
| **Canvas**        | ✅ | API token + base URL; courses + assignments with due dates. |
| **Gradescope**    | ✅ | Session cookie (no public API); fetches courses/assignments; fragile if cookie expires. |
| **Ed Discussion** | ✅ | API token; user courses + threads (announcements/pinned), deadline keyword + date extraction; `suggested: true`. |

### API routes
- **`/api/deadlines`** — GET (list), POST (create manual).
- **`/api/deadlines/[id]`** — GET, PATCH (status, suggested, etc.), DELETE (manual only).
- **`/api/tasks`** — GET, POST (with optional `deadlineId`, `estimateMinutes`).
- **`/api/tasks/[id]`** — PATCH, DELETE.
- **`/api/tasks/reorder`** — POST (ordered task IDs).
- **`/api/sync`** — POST (all sources or single `source`).
- **`/api/integrations`** — GET, POST (token/baseUrl per type).
- **`/api/study-sessions`** — GET, POST; **`/api/study-sessions/[id]`** — DELETE.
- **`/api/notifications/prefs`** — GET, POST.
- **`/api/notifications/push-subscribe`** — POST (store push subscription).
- **`/api/cron`** — GET, guarded by `CRON_SECRET`; runs sync for all users (Google Calendar, Canvas, Gmail, **Gradescope**, **Ed Discussion**) and `processNotifications()`.

### UI
- **Landing** (`/`) — Sign in with Google; explains Calendar + Gmail access.
- **Dashboard** — Sync All, Add Deadline, stats (Overdue / Due this week / Completed), suggested deadlines (confirm/dismiss), “Due this week” and “All upcoming” with `DeadlineCard`.
- **Calendar** — FullCalendar (month/week), deadlines + study sessions, colors by source; click deadline → detail.
- **Tasks** — List grouped by deadline + standalone; filters (all/pending/completed); toggle complete.
- **Planner** — Study sessions calendar; “Suggest sessions” (from upcoming deadlines with incomplete tasks); create/delete sessions.
- **Deadline detail** — Title, course, due date, priority, description, link; Mark complete/Reopen; subtasks with drag-and-drop reorder, add with optional estimate; delete if manual.
- **Settings** — Integrations (Google, Gmail, Canvas, **Gradescope**, Ed) with sync buttons; notification prefs (email, digest, push, SMS, reminder/urgent hours); push subscribe via `/sw.js`.

### Notifications
- **Scheduler** (`src/lib/notifications/scheduler.ts`) — Reminder (configurable hours before), urgent (e.g. 2h before), daily digest (next 7 days); dedup via `NotificationLog`.
- **Channels** — Email (Resend), SMS (Twilio), push (web-push + service worker); each gracefully no-ops if env not set.

---

## 2. What was missing / fixed in this pass

1. **Cron** — Previously did not run **Gradescope** or **Ed Discussion** sync. **Fixed:** both are now run for users who have those integrations.
2. **Settings** — No way to add **Gradescope** (cookie). **Fixed:** Gradescope section added with cookie input and helper text.
3. **Calendar** — **Ed Discussion** had no color. **Fixed:** `ED_DISCUSSION` added to `SOURCE_COLORS`.

---

## 3. What you still need to do to run it

### 3.1 Environment
Copy `.env.example` to `.env` and set:

- **`DATABASE_URL`** — Neon (or any Postgres). Required.
- **`AUTH_SECRET`** — `npx auth secret`. Required.
- **`AUTH_URL`** — e.g. `http://localhost:3000` (dev) or your production URL.
- **`AUTH_GOOGLE_ID`** and **`AUTH_GOOGLE_SECRET`** — Google OAuth (with Calendar + Gmail scopes). Required for sign-in and sync.
- **`CRON_SECRET`** — Any random string; must match what you send to `/api/cron`. Required if you use cron.
- **Optional:** Twilio (SMS), Resend (email), VAPID keys (push). Without them, notifications are no-ops or log-only.

### 3.2 Database
- Run **`npx prisma generate`** and **`npx prisma db push`** (or migrations) so the DB matches the schema.

### 3.3 Cron (production)
- **Vercel:** Cron is configured in `vercel.json` (`/api/cron` every hour). Set `CRON_SECRET` in Vercel and call the endpoint with `Authorization: Bearer <CRON_SECRET>` (e.g. via Vercel Cron or external scheduler).

---

## 4. Honest critique: usefulness and gaps

### Strengths
- **Single place for deadlines** — One list and calendar from multiple school tools.
- **Subtasks and study sessions** — Break work into tasks and block time; “Suggest sessions” ties planner to deadlines.
- **Suggested vs confirmed** — Gmail/Ed suggestions reduce noise until you confirm.
- **Notifications** — Reminder + urgent + digest with multiple channels.

### Weaknesses and risks
1. **No “what to do right now”** — Dashboard shows “due this week” and “all upcoming” but doesn’t answer “what should I do today?” or “what’s the next best action?” So it’s good for **visibility**, less for **daily prioritization**.
2. **Gradescope is brittle** — Cookie-based; expires on logout and can break with site changes. Code comment is right: Canvas often has the same assignments; Gradescope is a fallback.
3. **Gmail/Ed dates are heuristic** — Regex-based extraction can miss or misparse dates; false positives/negatives are possible.
4. **No sync status in UI** — User doesn’t see “last synced at” or per-source errors on the dashboard, only in Settings.
5. **Overwhelm** — If many sources are connected, the list can get long without smart filtering (e.g. “today”, “next 3 days”) or focus mode.
6. **Mobile** — Layout is responsive but not tuned for small screens; no PWA install or app-like chrome.
7. **README** — Still the default Next.js README; no project-specific setup or value proposition.

---

## 5. How to improve functionality and value

### High impact (do first)
1. **“Focus” or “Today” view**  
   - One section: “Do today” (due today + overdue + optionally “next 1–2”).  
   - Or a “Next action” strip: single next deadline + first incomplete subtask.  
   - **Value:** Answers “what do I do now?” and reduces decision fatigue.

2. **Sync status on dashboard**  
   - Show “Last synced: 5 min ago” and per-source status (e.g. “Canvas: OK”, “Gmail: 3 new”).  
   - **Value:** Trust and clarity; fewer “why didn’t it update?” moments.

3. **Project-specific README**  
   - Describe the app (student deadline hub), list env vars, DB setup, how to run dev and deploy, and optional cron.  
   - **Value:** You (and others) can onboard in minutes.

### Medium impact
4. **Filters and views**  
   - Filters: by source, by course, “due in next 3/7 days”, “has incomplete tasks”.  
   - **Value:** Less overwhelm when you have many items.

5. **Smarter suggestions**  
   - “Suggest sessions” could consider existing sessions (avoid double-booking) and preferred hours.  
   - **Value:** More realistic and personalized planner.

6. **Quick add**  
   - From dashboard or calendar: “Add deadline” with minimal fields (title + date), optional course.  
   - **Value:** Faster capture when you think of something.

### Nice to have
7. **PWA** — `manifest.json`, icons, “Add to home screen”; optional offline cache for the list.  
8. **Overdue once** — One “overdue” notification so you don’t forget, without spamming.  
9. **Export** — Export “due this week” as CSV or iCal for other tools.

---

## 6. Summary checklist

| Item | Status |
|------|--------|
| Auth (Google + scopes) | ✅ |
| DB schema + Prisma | ✅ |
| Sync: Google Calendar, Gmail, Canvas, Gradescope, Ed | ✅ |
| Cron: all 5 sources + notifications | ✅ (after fix) |
| Dashboard, Calendar, Tasks, Planner, Settings | ✅ |
| Deadline detail + subtasks + reorder | ✅ |
| Notifications (email, SMS, push, digest) | ✅ (env-dependent) |
| Gradescope + Ed in Settings | ✅ (Gradescope added) |
| Build | ✅ |
| Env + DB setup documented | ⚠️ Use this doc + .env.example |
| README for this project | ❌ Still default Next.js |
| “What to do now” / focus view | ✅ See IMPROVEMENTS.md |
| Sync status on dashboard | ✅ See IMPROVEMENTS.md |

**Bottom line:** The app is **usable for personal use** once you set `DATABASE_URL`, Auth, and optional notification env. The biggest leverage for your own time management is adding a **focus / “do today”** view and **sync status** on the dashboard; then improve README and filters as needed.

---

## 7. Post-report improvements

The following were added after this report. See **IMPROVEMENTS.md** for details and usage:

- **Motivation / accountability coach** — Chat-style bot (floating button) for bargaining and check-ins; uses deadline/task context; optional `OPENAI_API_KEY` for real LLM.
- **Focus / "Do today" view** — Dashboard section "What should I do now?" with next action and "Do today" list (today + overdue + tomorrow).
- **Sync status on dashboard** — "Last synced: X ago" and per-source status chips.
