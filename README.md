# Staff Manager

An internal dashboard for a staffing agency to manage workers, post jobs, match workers to jobs, and communicate via WhatsApp. Workers text in their availability naturally — Claude parses it automatically.

## What it does

- **Workers**: Add and manage workers with shift preferences, availability, and location. Workers can also text in their availability via WhatsApp and be auto-added.
- **Jobs**: Create job postings, auto-match workers by shift/location/availability, broadcast job offers via WhatsApp, track YES/NO responses, and assign workers.
- **Inbox**: Full WhatsApp conversation log with reply capability.

## Running locally

**1. Clone and install**
```bash
git clone <your-repo>
cd manage-staff
npm install
```

**2. Set up environment variables**
```bash
cp .env.local.example .env
```
Fill in the values (see Environment Variables below).

**3. Run the database schema**

Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql) and run the contents of `supabase/schema.sql`. Then run any pending migrations:
```bash
npm run db:push
```

**4. Start the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `SUPABASE_DB_URL` | Supabase → Settings → Database → Connection string (Transaction mode) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `META_WEBHOOK_VERIFY_TOKEN` | Any string you choose — enter the same value in Meta's webhook config |
| `META_WEBHOOK_SECRET` | Meta Developer Console → WhatsApp → Configuration → App Secret |
| `META_PHONE_NUMBER_ID` | Meta Developer Console → WhatsApp → API Setup → Phone Number ID |
| `META_ACCESS_TOKEN` | Meta Developer Console → WhatsApp → API Setup → Access Token |
| `NEXT_PUBLIC_DEV_BYPASS_AUTH` | Set to `true` locally to skip auth. Always `false` in production. |

## Database migrations

```bash
# Push pending migrations to remote database
npm run db:push

# Create a new migration file
npm run db:migration:new your_description_here

# Mark a migration as already applied (ran manually)
npm run db:repair <timestamp>
```

## Testing the webhook locally

The test script simulates WhatsApp messages without needing a real phone:

```bash
npm run dev          # terminal 1
npm run test:webhook # terminal 2
```

To test with a real WhatsApp number, expose your local server:

```bash
# ngrok
ngrok http 3000

# or Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3000
```

Set the resulting URL as your webhook in Meta Developer Console:
`https://your-tunnel-url/api/whatsapp/incoming`

## Connecting a real WhatsApp number

1. Go to [Meta Developer Console](https://developers.facebook.com)
2. Create an app → Add WhatsApp product
3. Register a phone number (must not already be on WhatsApp)
4. Fill in `META_PHONE_NUMBER_ID` and `META_ACCESS_TOKEN`
5. Create a message template named `job_broadcast` with 6 body parameters
6. Configure webhook URL: `https://your-app/api/whatsapp/incoming`
7. Set `META_WEBHOOK_VERIFY_TOKEN` and `META_WEBHOOK_SECRET`

See [Meta WhatsApp Cloud API docs](https://developers.facebook.com/docs/whatsapp/cloud-api) for full details.

## Deployment

1. Push to GitHub
2. Connect repo in [Vercel](https://vercel.com) — auto-deploys on every push to `main`
3. Add all environment variables in Vercel → Project → Settings → Environment Variables
4. Set `NEXT_PUBLIC_DEV_BYPASS_AUTH=false` in production
5. Add Vercel URL to Supabase → Authentication → Redirect URLs: `https://your-app.vercel.app/auth/callback`
