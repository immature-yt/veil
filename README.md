# veil 🌫️

> One match. 22 hours. No photos, no bios. Vote to reveal — or vanish forever.

A blind social connection app built API-first on **Next.js 14 (App Router)**, **Prisma**, and **PostgreSQL**. The same backend serves the web UI and is ready to power an Android app via identical REST endpoints.

---

## Table of Contents

- [The MVP Loop](#the-mvp-loop)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables ← READ THIS](#environment-variables)
- [API Reference](#api-reference)
- [Daily Cron Job](#daily-cron-job)
- [Real-Time Upgrades](#real-time-upgrades)
- [Android Integration](#android-integration)
- [Deployment](#deployment)
- [Roadmap](#roadmap)

---

## The MVP Loop

| Time | Event |
|------|-------|
| **10:00 AM** | **The Drop** — Each user gets one anonymous match with a temporary nickname |
| **10 AM → 8 AM** | **The Chat** — 22 hours of anonymous text chat |
| **8 AM → 10 AM** | **The Vote** — Chat locks. Both users vote Yes or No |
| **10:00 AM** | **Resolution** — Both Yes = real profiles revealed. Any No = chat permanently deleted. New match drops. |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js App                        │
│                                                     │
│  ┌──────────────┐      ┌─────────────────────────┐  │
│  │  Web UI      │      │   API Routes (/api/...)  │  │
│  │  (React)     │─────▶│   - /api/auth/*          │  │
│  │              │      │   - /api/match           │  │
│  │              │      │   - /api/messages        │  │
│  │              │      │   - /api/vote            │  │
│  └──────────────┘      └──────────┬──────────────┘  │
│                                   │                  │
│  ┌────────────────────────────────▼──────────────┐  │
│  │              Prisma ORM                        │  │
│  └────────────────────────────────┬──────────────┘  │
└───────────────────────────────────┼─────────────────┘
                                    │
                         ┌──────────▼─────────┐
                         │   PostgreSQL DB      │
                         └─────────────────────┘

Android App ──────────────────────▶ Same /api/ routes
                              (Authorization: Bearer <token>)
```

**Key design decisions:**
- **JWT-based auth** (not session cookies) — works identically for browser and mobile
- **API routes return consistent JSON** `{ success: boolean, data?: T, error?: string }`
- All business logic lives in `/api/` — the React UI is just a consumer

---

## Project Structure

```
veil/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts     # POST /api/auth/login
│   │   │   │   ├── register/route.ts  # POST /api/auth/register
│   │   │   │   └── me/route.ts        # GET  /api/auth/me
│   │   │   ├── match/route.ts         # GET + POST /api/match
│   │   │   ├── messages/route.ts      # GET + POST /api/messages
│   │   │   └── vote/route.ts          # POST /api/vote
│   │   ├── chat/page.tsx              # Chat UI
│   │   ├── login/page.tsx             # Auth UI
│   │   ├── vote/page.tsx              # Vote UI
│   │   ├── layout.tsx                 # Root layout (phone-frame wrapper)
│   │   ├── page.tsx                   # Home / phase router
│   │   ├── providers.tsx              # Client providers wrapper
│   │   └── globals.css
│   ├── components/
│   │   ├── AuthProvider.tsx           # Auth context + JWT management
│   │   └── CountdownTimer.tsx         # Phase countdown timer
│   └── lib/
│       ├── auth.ts                    # JWT sign/verify helpers
│       ├── matchUtils.ts              # Timing logic + nickname generator
│       ├── prisma.ts                  # Prisma singleton
│       └── apiResponse.ts             # ok() / err() helpers
├── .env.example                       # ← All env vars documented here
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- A PostgreSQL database (see options below)

### 1. Clone & Install

```bash
git clone <your-repo>
cd veil
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the required values (see [Environment Variables](#environment-variables) below).

### 3. Set Up the Database

```bash
# Generate the Prisma client
npx prisma generate

# Push the schema to your database (creates tables)
npx prisma db push

# (Optional) Open Prisma Studio to browse your data
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

> ⚠️ **All variables listed here must be set before the app works correctly.**
> Copy `.env.example` to `.env.local` and fill in every value.

### Required (App will not start without these)

| Variable | Where to get it | Description |
|----------|----------------|-------------|
| `DATABASE_URL` | Your DB provider | PostgreSQL connection string |
| `JWT_SECRET` | `openssl rand -base64 32` | Secret key for signing JWTs (32+ random chars) |

**`DATABASE_URL` format:**
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?schema=public
```

**PostgreSQL providers (pick one):**
- **Supabase** (free tier): supabase.com → Project Settings → Database → Connection String
- **Neon** (free tier): neon.tech → Dashboard → Connection Details
- **Railway**: railway.app → Your project → PostgreSQL → Connect
- **PlanetScale**: Does *not* support Prisma relations well — use another option

---

### Authentication

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ Yes | Signs user tokens. Keep this secret. Rotate it to log out all users. |
| `NEXTAUTH_SECRET` | Future | Only needed if you add OAuth (Google, Apple login) |
| `NEXTAUTH_URL` | Future | Your app's base URL, e.g. `https://yourdomain.com` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth — create at console.cloud.google.com |
| `GOOGLE_CLIENT_SECRET` | Optional | Paired with GOOGLE_CLIENT_ID |

---

### File Storage (Profile Photos)

Profile photos are required for the "Reveal" feature. Choose **one** provider:

#### Option A: Cloudinary (recommended for simplicity)

1. Create account at cloudinary.com
2. Go to Dashboard → API Keys

```env
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="your-secret-here"
```

#### Option B: AWS S3

1. Create an S3 bucket with public read access (or presigned URLs)
2. Create an IAM user with `s3:PutObject` and `s3:GetObject` permissions

```env
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="veil-profile-photos"
```

Then add your bucket/cloudinary domain to `next.config.js`:
```js
images: {
  domains: ["res.cloudinary.com"],  // or your S3 bucket URL
}
```

---

### Real-Time Messaging

The MVP uses polling (every 5 seconds). For production, add real-time:

#### Option: Pusher (works in serverless environments like Vercel)

1. Create account at pusher.com → Create App → Get Keys

```env
PUSHER_APP_ID="1234567"
PUSHER_KEY="abc123"
PUSHER_SECRET="def456"
PUSHER_CLUSTER="us2"
NEXT_PUBLIC_PUSHER_KEY="abc123"      # Must be NEXT_PUBLIC_ to reach browser
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
```

Then in `/src/app/api/messages/route.ts`, uncomment:
```typescript
// await pusher.trigger(`match-${matchId}`, "new-message", { message });
```

And in the chat page, replace the polling `setInterval` with a Pusher subscription.

---

### Payments (Future Premium Features)

For features like "Super Reveal," boosts, or subscriptions:

1. Create account at stripe.com → Developers → API Keys
2. Set up a webhook at stripe.com → Webhooks → Add endpoint

```env
STRIPE_SECRET_KEY="sk_live_..."          # Use sk_test_ in development
STRIPE_WEBHOOK_SECRET="whsec_..."        # From Stripe webhook dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

---

### App Config

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Your app's base URL |
| `DROP_HOUR_UTC` | `10` | Hour (0-23 UTC) when daily matches drop |
| `CHAT_DURATION_HOURS` | `22` | How many hours the chat is open |
| `CRON_SECRET` | — | Secret header value for the matchmaking cron endpoint |

---

### Environment for Different Stages

```bash
# Development
.env.local          ← local dev, never committed

# Production (set in your hosting provider's dashboard)
# Vercel: vercel.com → Project → Settings → Environment Variables
# Railway: railway.app → Variables tab
```

---

## API Reference

All endpoints return `{ success: boolean, data?: any, error?: string }`.

Authentication: pass `Authorization: Bearer <token>` header on all protected routes.

### Auth

| Method | Endpoint | Body | Auth | Description |
|--------|----------|------|------|-------------|
| POST | `/api/auth/register` | `{name, email, password}` | No | Create account. Returns `{token, user}` |
| POST | `/api/auth/login` | `{email, password}` | No | Sign in. Returns `{token, user}` |
| GET | `/api/auth/me` | — | ✅ | Get current user profile |

### Match

| Method | Endpoint | Body | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/api/match` | — | ✅ | Get today's match + current phase |
| POST | `/api/match` | — | Cron header | Trigger daily matchmaking |

**Match response shape:**
```json
{
  "match": {
    "id": "clx...",
    "phase": "CHAT",           // CHAT | VOTE | RESOLVED
    "outcome": null,           // null | REVEALED | WIPED
    "myNick": "GoldenFox",
    "theirNick": "SilentCrane",
    "expiresAt": "2024-01-15T08:00:00Z",
    "myVote": null,            // null | true | false
    "theirVoteSubmitted": false,
    "revealData": null         // {name, photoUrl} if REVEALED
  },
  "phase": "CHAT",             // Global phase: WAITING | CHAT | VOTE
  "nextTransition": "2024-01-15T08:00:00Z"
}
```

### Messages

| Method | Endpoint | Body | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/api/messages?matchId=<id>` | — | ✅ | Fetch all messages (sender IDs replaced with nicknames) |
| POST | `/api/messages` | `{matchId, content}` | ✅ | Send a message |

### Vote

| Method | Endpoint | Body | Auth | Description |
|--------|----------|------|------|-------------|
| POST | `/api/vote` | `{matchId, vote: boolean}` | ✅ | Submit Yes/No vote. Auto-resolves when both vote. |

---

## Daily Cron Job

The matchmaking (`POST /api/match`) must be triggered at 10:00 AM UTC every day.

### Option A: Vercel Cron Jobs (recommended)

Create `vercel.json` in the project root:

```json
{
  "crons": [
    {
      "path": "/api/match",
      "schedule": "0 10 * * *"
    }
  ]
}
```

Then update the route to handle Vercel's cron authentication (they pass a header automatically).

### Option B: External cron (GitHub Actions, cron-job.org, etc.)

```bash
# cURL example — run this at 10 AM UTC daily
curl -X POST https://yourdomain.com/api/match \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

Set `CRON_SECRET` in your environment variables.

### Option C: Upstash QStash

Useful if you're on Vercel's free tier and want reliable scheduled jobs:
1. Create account at upstash.com → QStash
2. Schedule a POST to `/api/match` with your cron secret header

---

## Real-Time Upgrades

The MVP chat polls every 5 seconds. To add real-time:

### Pusher (serverless-friendly)

```bash
npm install pusher pusher-js
```

1. Trigger in `POST /api/messages`:
```typescript
import Pusher from "pusher";
const pusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
await pusher.trigger(`match-${matchId}`, "message", { message });
```

2. Subscribe in `chat/page.tsx`:
```typescript
import Pusher from "pusher-js";
const client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, { cluster });
const channel = client.subscribe(`match-${matchId}`);
channel.bind("message", (data: any) => setMessages(prev => [...prev, data.message]));
```

### Socket.io (self-hosted)

If you self-host (e.g., Railway, Render), you can use Socket.io with Next.js via a custom server. See: https://socket.io/how-to/use-with-nextjs

---

## Android Integration

The API is fully REST-compatible. Android integration steps:

1. **Auth**: Call `POST /api/auth/login` or `/api/auth/register` → store the JWT token securely (Android Keystore / EncryptedSharedPreferences)

2. **All requests**: Add header `Authorization: Bearer <stored_token>`

3. **Phase sync**: Poll `GET /api/match` every 30 seconds, or use Pusher on Android for real-time

4. **Push Notifications** (add later): When a match drops, use Firebase Cloud Messaging:
   - Store FCM token in the `User` model: add `fcmToken String?` to `schema.prisma`
   - Trigger notification in `POST /api/match` after creating each match

Example Android (Kotlin / Retrofit):
```kotlin
interface VeilApi {
    @POST("api/auth/login")
    suspend fun login(@Body body: LoginBody): Response<AuthResponse>

    @GET("api/match")
    suspend fun getMatch(@Header("Authorization") token: String): Response<MatchResponse>

    @POST("api/messages")
    suspend fun sendMessage(
        @Header("Authorization") token: String,
        @Body body: MessageBody
    ): Response<MessageResponse>
}
```

---

## Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel
```

Set all environment variables in Vercel Dashboard → Project → Settings → Environment Variables.

### Railway

1. Push to GitHub
2. Create new Railway project → Deploy from GitHub repo
3. Add a PostgreSQL plugin (Railway provides one)
4. Set environment variables in Railway's Variables tab
5. The `DATABASE_URL` is auto-injected when you add PostgreSQL

### Docker (self-hosted)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Roadmap

### Phase 1 (MVP — this repo)
- [x] Anonymous daily matching
- [x] 22-hour chat window
- [x] Yes/No vote system
- [x] Identity reveal on mutual Yes
- [x] Permanent wipe on No

### Phase 2
- [ ] Push notifications (FCM for Android, APNs for iOS)
- [ ] Real-time chat via Pusher
- [ ] Photo upload for profiles (Cloudinary)
- [ ] Phone number auth (Twilio / Firebase)

### Phase 3
- [ ] Premium features via Stripe (unlimited re-matches, "Super Reveal", etc.)
- [ ] Preference matching (gender, age range)
- [ ] Report & block system
- [ ] iOS app

---

## Security Notes

- **JWT Secret**: Rotate `JWT_SECRET` if compromised — this logs out all users
- **Cron Secret**: Protect `POST /api/match` — anyone who calls it can trigger matchmaking
- **Rate limiting**: Add rate limiting to auth routes before going to production (use Upstash Ratelimit or similar)
- **Image uploads**: Validate file types and sizes server-side before uploading to Cloudinary/S3
- **HTTPS**: Always use HTTPS in production — JWTs are credentials

---

*Built with Next.js 14, Prisma, PostgreSQL, and Tailwind CSS.*
