# Satmar Matzah Bakery Voice POS System

## Overview
A complete Voice AI backend and dashboard for Satmar Matzah Bakery. The system handles incoming calls via LiveKit, manages orders in a PostgreSQL database with JSON backup fallback, and provides a secure web dashboard for bakery workers.

## Architecture

### Frontend (React + Vite)
- **Landing Page**: Shown to unauthenticated users with login options
- **Dashboard**: Overview with stats, order volume chart, recent activity (authenticated)
- **Orders**: View all orders, filter by status, import/export CSV/JSON (authenticated)
- **Customers**: Customer management with phone numbers and purchase history tracking (authenticated)
- **Products**: Manage matzah types and prices (authenticated)
- **Transcripts**: View call conversation history (authenticated)
- **Logs**: Agent activity logs (authenticated)
- **Settings**: Editable business configuration (hours, pricing, agent personality) with dynamic updates to voice agent (authenticated)

### Backend (Express + TypeScript)
- **Authentication**: Replit Auth (OpenID Connect) with session management
- **Security**: Helmet headers, CORS restrictions, rate limiting
- **API Routes**: Full CRUD for orders, logs, transcripts, inventory, config (protected)
- **Database**: PostgreSQL via Drizzle ORM
- **Backup**: JSON file backup utilities for offline resilience

### Voice Agent (Python + LiveKit)
Located in `/agent/` directory:
- `main.py`: Voice pipeline agent with configurable STT/LLM/TTS
- `bakery_functions.py`: AI-callable tools for orders, status, payments, transfers

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React, TailwindCSS, Recharts |
| Backend | Express, Drizzle ORM, PostgreSQL |
| Auth | Replit Auth (OIDC), Passport.js |
| Security | Helmet, CORS, express-rate-limit |
| Voice Agent | livekit-agents, livekit-plugins-deepgram, livekit-plugins-openai |
| Payments | Twilio Pay (DTMF keypad capture) |

## Environment Variables

### Required for Backend
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key (auto-provided by Replit)

### Required for Voice Agent
- `LIVEKIT_URL` - LiveKit Cloud WebSocket URL
- `LIVEKIT_API_KEY` - LiveKit API Key
- `LIVEKIT_API_SECRET` - LiveKit API Secret
- `GROQ_API_KEY` - Groq API Key (for STT and fast LLM)
- `OPENROUTER_API_KEY` - OpenRouter API Key (for Claude/Gemini)
- `ELEVENLABS_API_KEY` - ElevenLabs API Key (for TTS)

### Optional Security
- `AGENT_API_KEY` - API key for voice agent to access protected endpoints

### Twilio Payments (Required for DTMF collection)
- `TWILIO_ACCOUNT_SID` - Twilio account SID for voice + payments
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio voice number receiving orders
- `TWILIO_PAY_CONNECTOR` - Twilio Pay connector name for DTMF collection

### Optional
- `POWER_AUTOMATE_URL` - Microsoft Power Automate webhook URL
- `OFFICE_TRANSFER_NUMBER` - Phone number for SIP transfers (default: +17185551234)
- `SIP_OUTBOUND_TRUNK_ID` - LiveKit SIP outbound trunk ID for call transfers (get from `lk sip outbound list`)
- `API_BASE_URL` - Backend API URL (default: http://localhost:5000)

### Configurable Agent Settings
- `STT_PROVIDER` - Speech-to-text provider (default: groq)
- `STT_MODEL` - STT model (default: whisper-large-v3)
- `LLM_PROVIDER` - LLM provider (default: openrouter)
- `TTS_PROVIDER` - Text-to-speech provider (default: elevenlabs)
- `TTS_VOICE` - TTS voice name (default: Josh)
- `ELEVENLABS_VOICE_ID` - ElevenLabs voice ID (default: TxGEqnHWrfWFTfGW9XjX)

## AI Stack Configuration

The voice agent uses LiveKit Cloud inference with the following models:

| Component | Model | Details |
|-----------|-------|---------|
| STT | Deepgram Nova-3 | High accuracy, ~550ms latency |
| LLM | Google Gemini 2.5 Flash-Lite | Fast inference, low cost |
| TTS | ElevenLabs Flash v2.5 | Chris voice (iP95p4xoKVk53GoZ742B), professional tone |

### Backup Configuration (via OpenRouter)
| Component | Model | Use Case |
|-----------|-------|----------|
| STT | AssemblyAI | If Deepgram unavailable |
| LLM | Groq Llama 4 Maverick | Speed + quality backup (~465ms) |
| TTS | ElevenLabs Flash v2.5 | Same as primary |

**Routing Logic:**
- "Accurate" route: Triggered by order keywords, phone numbers, payment terms, longer messages
- "Fast-Cheap" route: Triggered by simple greetings, basic questions, short messages

Logs show which model was used for each call.

## API Endpoints

### Authentication
- `GET /api/login` - Begin login flow
- `GET /api/logout` - Logout user
- `GET /api/callback` - OIDC callback
- `GET /api/auth/user` - Get authenticated user (protected)

### Orders (protected)
- `GET /api/orders` - List all orders
- `GET /api/orders/:id` - Get single order
- `GET /api/orders/phone/:phone` - Get orders by phone (public for voice agent)
- `POST /api/orders` - Create order (public for voice agent)
- `PATCH /api/orders/:id` - Update order
- `PATCH /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/payment-dtmf` - Start Twilio Pay DTMF payment flow (requires auth or agent API key)

### Order Items (multi-item order support)
- `GET /api/orders/:id/items` - Get order items (public for voice agent)
- `POST /api/orders/:id/items` - Add item to order (public for voice agent)
- `DELETE /api/orders/:id/items` - Remove all items from order (protected)

### Business Settings (dynamic configuration)
- `GET /api/business-settings` - Get all business settings (public for voice agent)
- `PUT /api/business-settings` - Update business settings (protected)

### Customers (protected)
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get single customer
- `GET /api/customers/phone/:phone` - Get customer by phone (public for voice agent)
- `POST /api/customers` - Create customer
- `PATCH /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Products
- `GET /api/products` - List all products (public for voice agent)
- `GET /api/products/:id` - Get single product (protected)
- `POST /api/products` - Create product (protected)
- `PATCH /api/products/:id` - Update product (protected)
- `DELETE /api/products/:id` - Delete product (protected)

### Import/Export (protected)
- `GET /api/backup/export` - Export all data (JSON)
- `POST /api/backup/import` - Import orders from JSON
- `POST /api/import/orders` - Import orders from CSV/JSON file

### Other (protected)
- `GET /api/logs` - List agent logs
- `GET /api/transcripts` - List call transcripts
- `GET /api/inventory` - List inventory
- `GET /api/config` - List agent config

## Voice Agent Capabilities

1. **Create Order** - Takes matzah orders with customer details
2. **Check Order Status** - Lookup orders by phone number
3. **Get Customer History** - Check if caller has ordered before and offer their previous order
4. **Collect DTMF Payment** - Runs Twilio Pay keypad flow during the call (no internet link required)
5. **Transfer to Office** - SIP REFER transfer to office line
6. **Get Bakery Info** - Hours, location, contact (uses dynamic settings)
7. **Get Menu** - Matzah types and prices (uses dynamic settings)

## Timezone Support

All date/time operations use **EST (America/New_York)** timezone:
- Voice agent uses EST for all internal timestamps
- Google Calendar appointment lookups return EST times
- Logs and transcripts are timestamped in EST

## Call Transcription

The voice agent automatically captures and saves call transcripts to the database:
- Uses `session.history` from LiveKit SDK for reliable conversation capture
- Saves transcripts when calls disconnect with caller phone, duration, and full conversation
- Thread pool executor ensures saves complete reliably even if calls end quickly
- Retry logic with exponential backoff handles transient API failures
- View transcripts in the Dashboard → Transcripts page

## Security Features

- **Authentication**: Replit Auth with OIDC (Google, GitHub, email/password)
- **Session Management**: PostgreSQL-backed secure sessions
- **Rate Limiting**: 100 requests/15min for API, 20 requests/15min for auth endpoints
- **CORS**: Restricted to known origins only
- **HTTP Headers**: Helmet middleware for secure headers
- **API Key Auth**: Voice agent uses X-Agent-API-Key header for protected endpoints

## Running Both Services

Use the provided startup script to run both dashboard and voice agent:
```bash
./start.sh
```

Or run them separately:
```bash
# Dashboard (Express + React)
npm run dev

# Voice Agent (in another terminal)
cd agent
pip install -r requirements.txt
export AGENT_API_KEY=your-secret-key
python main.py dev
```

## Dynamic Settings (Agency Mode)

All business settings are stored in the database and editable from the dashboard Settings page:
- **Business Info**: Name, address, hours
- **Pricing**: Price per lb, delivery fee, matzah types
- **Voice Agent**: Agent name, greeting message, custom instructions

The voice agent fetches fresh settings from `/api/business-settings` on each new call, ensuring real-time configuration updates without needing to restart the agent.

## Pricing
- Regular/Whole Wheat/Spelt Matzah: $25/lb
- Delivery fee: $10

## Business Hours
- Mon-Thu: 9AM - 7PM
- Friday: 9AM - 1PM
- Sunday: 10AM - 5PM
- Closed Shabbos

## Address
38 Locust Street, Brooklyn, NY

## Calendar Integration
- Google Calendar: Uses shared calendar from burechspitzer@gmail.com
- Connected via: 4091700sofer@gmail.com (has view access to shared calendar)
- Used for order pickup/delivery scheduling and appointment lookups


## Production Readiness

Use `docs/production-readiness-plan.md` as the release gate for production rollout. The legacy MVP plan is deprecated.

## Deploying to Railway (PostgreSQL)

Use `railway.json` for build/start defaults and follow `docs/railway-deployment.md` for production setup.

Quick commands:
- Build: `npm ci && npm run build`
- Start: `npm run start`
- Migrate DB: `npm run db:push`


## Implemented Backend (Current Repo)

The repository now includes a runnable Express backend in `server/index.ts` with:
- `GET /healthz`
- `POST /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders/:id/payment-dtmf` (Twilio `<Pay>` TwiML response)
- `POST /api/orders/:id/payment-dtmf/callback`
- `POST /api/twilio/voice`
- `POST /api/twilio/voice/route-payment`

Database bootstrap is in `server/db.ts` (auto-creates `orders` table on startup).

Protected API routes now require `AGENT_API_KEY` via `x-agent-api-key` or `Authorization: Bearer`. Twilio webhook routes validate `X-Twilio-Signature`.
