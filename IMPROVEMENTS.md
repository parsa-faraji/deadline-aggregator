# Recent improvements

This document lists features added on top of the core deadline-aggregator app and how to use them.

---

## 1. Motivation / accountability coach (chat bot)

**What it is:** A chat-style UI where you can talk to a supportive bot for motivation and accountability. The bot helps with “bargaining” (e.g. “I’ll do one task then take a break”, “what if we just do 25 minutes?”) and uses your deadline and task data from the app to give contextual suggestions (e.g. “You have 3 things due this week—want to pick one to focus on?”).

**How to use it:**
- Click the **blue floating button** (message icon) at the bottom-right of the screen on any main app page (Dashboard, Calendar, Tasks, Planner, Settings).
- A slide-out panel opens. Type a message and press Enter or click Send.
- Messages are stored in your browser (localStorage) so they persist across refreshes.
- The coach receives a short summary of your deadlines and tasks (overdue, due this week, incomplete tasks) so it can give relevant replies.

**Backend:**
- **API route:** `POST /api/chat` (body: `{ messages: { role, content }[], context?: string }`).
- If **`ANTHROPIC_API_KEY`** is set, the route uses Claude (Anthropic) for the coach. If **`OPENAI_API_KEY`** is set instead, it uses OpenAI (e.g. `gpt-4o-mini`). Both use the same system prompt for the coach’s behavior.
- If neither key is set, the API returns a stub message asking you to set one. The chat UI still works; you’ll just see that message until a key is configured.

**Env var:**
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` — Optional. Set one to enable the AI coach (Claude is used first if both are set). Without either, the coach explains that a key is required.

---

## 2. Focus / “What should I do now?” view (dashboard)

**What it is:** A section on the **Dashboard** that answers “What should I do now?” with:
- **Next action** — The single next deadline (by due date) and its first incomplete subtask, with a link to the deadline detail page.
- **Do today** — A short list of items due today, overdue, or tomorrow (up to 6 shown, with a “+N more” if needed), so you can prioritize without scanning the full list.

**How to use it:**
- Open the **Dashboard**. The “What should I do now?” block appears below the stats (Overdue, Due This Week, Completed) and sync status.
- Use “Next action” to jump straight into the next due item and its first task.
- Use “Do today” to see everything that’s due today, overdue, or tomorrow in one place.

---

## 3. Sync status on dashboard

**What it is:** On the **Dashboard** you now see:
- **Last synced: X ago** — The most recent sync time across all your connected sources (from Integration `lastSync`).
- **Per-source status** — A row of chips for each integration (e.g. Google Calendar, Canvas, Gmail). Each chip shows the source name and either a checkmark (synced) or an error message if the last sync for that source failed.

**How to use it:**
- After loading the Dashboard, check the line under “X deadlines tracked” for “Last synced: …”.
- Check the chips below the header to see which sources are OK and which had errors. Hover for the full “Synced X ago” or error text.
- Use **Sync All** to refresh; the “Last synced” and per-source status update after the sync finishes.

---

## Summary

| Feature              | Where to find it                         | Env / config        |
|----------------------|------------------------------------------|---------------------|
| Motivation coach     | Floating button (bottom-right) → chat    | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` |
| Focus / Do today     | Dashboard → “What should I do now?”      | —                   |
| Sync status          | Dashboard → under header + source chips  | —                   |
