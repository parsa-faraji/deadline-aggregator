# Deadline Aggregator

[![CI](https://github.com/parsa-faraji/deadline-aggregator/actions/workflows/ci.yml/badge.svg)](https://github.com/parsa-faraji/deadline-aggregator/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A student deadline aggregator that pulls assignments and due dates from **Google Calendar**, **Canvas LMS**, **Gmail**, **Gradescope**, and **Ed Discussion** into a single dashboard. Built with Next.js, Prisma, and Neon Postgres.

## Features

- **Unified dashboard** -- View all deadlines across platforms with overdue/due-this-week/completed stats and a "What should I do now?" focus section.
- **Multi-source sync** -- Google Calendar (OAuth), Canvas (API token), Gmail (keyword scan), Gradescope (session cookie), and Ed Discussion (API token).
- **Calendar view** -- FullCalendar integration with color-coded events by source.
- **Subtasks & drag-and-drop** -- Break deadlines into subtasks with time estimates and reorderable lists.
- **Study planner** -- Schedule study sessions with auto-suggestions based on upcoming deadlines.
- **Notifications** -- Email (Resend), SMS (Twilio), and push notifications with configurable reminder windows.
- **AI motivation coach** -- Chat-based study coach powered by Claude or OpenAI with deadline-aware context.
- **Suggested deadlines** -- Gmail and Ed Discussion items appear as suggestions you can confirm or dismiss.
- **PWA support** -- Installable as a Progressive Web App with offline caching.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | [TypeScript 5](https://www.typescriptlang.org) |
| Database | [Neon Postgres](https://neon.tech) via [Prisma](https://www.prisma.io) |
| Auth | [NextAuth v5](https://authjs.dev) (Google OAuth) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Calendar | [FullCalendar](https://fullcalendar.io) |
| Drag & Drop | [dnd-kit](https://dndkit.com) |
| Notifications | [Resend](https://resend.com), [Twilio](https://twilio.com), [Web Push](https://github.com/nicoll/web-push) |
| AI Coach | [Anthropic Claude](https://anthropic.com) or [OpenAI](https://openai.com) |
| Deployment | [Vercel](https://vercel.com) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) Postgres database (or any Postgres instance)
- A [Google Cloud](https://console.cloud.google.com) project with OAuth credentials (Calendar + Gmail scopes)

### Installation

```bash
git clone https://github.com/parsa-faraji/deadline-aggregator.git
cd deadline-aggregator
npm install
```

### Environment Setup

Copy the example env file and fill in the required values:

```bash
cp .env.example .env
```

**Required variables:**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | Run `npx auth secret` to generate |
| `AUTH_URL` | `http://localhost:3000` for dev |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |

**Optional variables** (see [SETUP-OPTIONAL.md](./SETUP-OPTIONAL.md) for details):

| Variable | Feature |
|----------|---------|
| `CRON_SECRET` | Protects the `/api/cron` endpoint |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | AI motivation coach |
| `RESEND_API_KEY` | Email notifications |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS notifications |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Push notifications |

### Database Setup

```bash
npx prisma generate
npx prisma db push
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
  app/
    api/
      auth/           # NextAuth handlers
      chat/           # AI coach endpoint
      cron/           # Scheduled sync + notifications
      deadlines/      # CRUD for deadlines
      integrations/   # Manage source connections
      notifications/  # Notification preferences & push subscriptions
      study-sessions/ # Study session CRUD
      sync/           # Trigger source syncs
      tasks/          # Subtask CRUD & reordering
    (main)/
      calendar/       # Calendar view
      dashboard/      # Main dashboard
      deadline/[id]/  # Deadline detail page
      planner/        # Study planner
      settings/       # Integration & notification settings
      tasks/          # Task list view
  components/         # Shared UI components
  lib/
    notifications/    # Email, SMS, push, scheduler
    sync/             # Per-source sync logic
    auth.ts           # NextAuth config
    db.ts             # Prisma client (Neon adapter)
    google.ts         # Google token refresh
    utils.ts          # Shared utilities
prisma/
  schema.prisma       # Database schema
```

## Deployment

The app is configured for **Vercel** deployment:

1. Push to GitHub and import the repo in [Vercel](https://vercel.com).
2. Add all required environment variables in Vercel project settings.
3. Vercel will automatically run `prisma generate` during the build.
4. The cron job in `vercel.json` runs `/api/cron` daily to sync sources and send notifications.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
