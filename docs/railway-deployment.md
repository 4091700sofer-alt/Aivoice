# Railway Deployment Guide (PostgreSQL + Twilio DTMF)

This project is configured to deploy on Railway using a managed PostgreSQL database.

## 1) Create Railway Project
1. Go to Railway and create a new project.
2. Connect this GitHub repository.
3. Add a **PostgreSQL** service from Railway marketplace.

Railway will inject `DATABASE_URL` automatically for linked services.

## 2) Configure the Web Service
Railway uses `railway.json` in repo root:
- Build: `npm ci && npm run build`
- Start: `npm run start`

If you prefer UI config, use the same commands in service settings.

## 3) Required Environment Variables
Set these on the deployed web service:

### Core App
- `DATABASE_URL` (auto-provided when Postgres is attached)
- `SESSION_SECRET`
- `NODE_ENV=production`
- `BASE_URL=https://<your-domain>` (required for Twilio signature verification)

### Voice + AI
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `ELEVENLABS_API_KEY`

### Twilio DTMF Payments
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_PAY_CONNECTOR`

### Optional Security
- `AGENT_API_KEY` (required in production for protected API endpoints)

## 4) Database Migration
After first deploy, open Railway service shell and run:

```bash
npm run db:push
```

This applies Drizzle schema changes to Railway PostgreSQL.

## 5) Domain + Webhooks
1. Assign a Railway domain (or custom domain).
2. Point Twilio Voice webhook to your production endpoint (example):
   - `https://<your-domain>/api/twilio/voice`
3. If you use status callbacks, configure Twilio status callback URLs to your production domain.
4. Twilio signatures are validated on webhook routes; keep `BASE_URL` accurate.

## 6) Production Validation Checklist
- Service boots without missing env errors.
- `DATABASE_URL` reachable from app service.
- DB schema applied (`npm run db:push`).
- Inbound test call creates an order.
- DTMF payment attempt returns success/failure events and order updates.
- Logs confirm payment token/reference only (no card data stored).

## 7) Recommended Railway Layout
Use separate services for cleaner operations:
- **web**: Express/Vite backend + dashboard
- **agent** (optional): LiveKit voice worker process
- **postgres**: Railway managed PostgreSQL

If deploying agent separately, set its start command to your agent runtime entrypoint and share the same `DATABASE_URL` + API keys.

## 8) Smoke Tests After Deploy
Run against your Railway domain:

```bash
curl -s https://<your-domain>/healthz
```

Create a test order:

```bash
curl -s -X POST https://<your-domain>/api/orders \
  -H 'content-type: application/json' \
  -H 'x-agent-api-key: <AGENT_API_KEY>' \
  -d '{"customerName":"Test Caller","phone":"+17185550000","items":[{"name":"Regular Matzah","qty":1}],"totalCents":2500}'
```
