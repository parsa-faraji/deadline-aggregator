# Optional env vars – how to get them

These are already set in `.env`:
- **CRON_SECRET** – generated; use this value when calling `/api/cron` (e.g. `Authorization: Bearer <CRON_SECRET>`).
- **VAPID keys** – generated; push notifications will work once the app is running.

Fill in the ones below when you want those features.

---

## 1. AI motivation coach (Claude or OpenAI)

The chat coach supports **Claude (Anthropic)** or **OpenAI**. Set one of these in `.env`:

**Option A – Claude (recommended)**  
1. Go to [console.anthropic.com](https://console.anthropic.com) and sign in.  
2. **API Keys** → **Create Key**.  
3. Copy the key and set in `.env`:
   ```env
   ANTHROPIC_API_KEY="sk-ant-..."
   ```

**Option B – OpenAI**  
1. Go to [platform.openai.com](https://platform.openai.com) and sign in.  
2. **API keys** → **Create new secret key**.  
3. Copy the key and set in `.env`:
   ```env
   OPENAI_API_KEY="sk-..."
   ```

If both are set, **Claude is used first**. Restart the dev server after adding a key.

---

## 2. RESEND_API_KEY (email reminders & daily digest)

1. Sign up at [resend.com](https://resend.com).
2. **API Keys** → **Create API Key**.
3. Copy the key and set in `.env`:
   ```env
   RESEND_API_KEY="re_..."
   ```
4. By default the app sends from `deadlines@resend.dev` (Resend’s test domain). For your own domain, configure it in Resend and update the `from` address in `src/lib/notifications/email.ts`.

---

## 3. Twilio (SMS reminders)

1. Sign up at [twilio.com](https://twilio.com).
2. In [Console](https://console.twilio.com): note **Account SID** and **Auth Token**.
3. Get a phone number: **Phone Numbers** → **Buy a number** (trial can use a Twilio number).
4. Set in `.env`:
   ```env
   TWILIO_ACCOUNT_SID="AC..."
   TWILIO_AUTH_TOKEN="..."
   TWILIO_PHONE_NUMBER="+1234567890"
   ```
5. Users enter their phone number in **Settings**; the app stores it and uses Twilio to send SMS reminders.

---

## 4. Calling the cron job (sync + notifications on a schedule)

If you deploy to **Vercel**, the cron in `vercel.json` runs hourly and will send requests to `/api/cron` with the correct auth. Add `CRON_SECRET` to your Vercel project env with the same value as in `.env`.

If you use another host or a separate scheduler (e.g. cron.org, GitHub Actions), call:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app-url.com/api/cron
```

Use the `CRON_SECRET` value from your `.env`.
