# AI Voice POS - Production Readiness Plan (Flip-Phone Stores)

## Production Objective
Launch a stable and auditable AI Voice POS that can reliably process high phone-order volume for stores serving customers without smartphones or internet.

## Scope (Fixed)
- Channel: inbound and callback phone calls only
- Customer profile: flip-phone / no-internet users
- POS: local custom POS integration
- Payments: **Twilio Pay DTMF only** (no payment links, no web checkout)

## Production Acceptance Criteria
A release is considered production-ready only when all criteria pass:

1. **Order Capture Reliability**
   - 99%+ successful order creation from answered calls
   - p95 order capture time <= 90 seconds
2. **Transcription + Confirmation Quality**
   - <2% corrected line-item error rate after mandatory read-back
3. **Operational Resilience**
   - Automatic manual-mode fallback available in <= 1 tap
   - Callback queue persists missed calls with retry policy
4. **Payment Reliability (DTMF)**
   - 98%+ Twilio Pay session completion for callers who attempt payment
   - Tokenized payment response only; no PAN/CVV storage anywhere
5. **Observability + Compliance**
   - Structured logs, transcript retention policy, auditable payment outcomes
   - Alerting for queue backlog, payment failure spikes, and API errors

## Production Build Tracks

### 1) Core Call-to-Order Flow
- Build a single deterministic order state machine:
  `new_call -> identify_customer -> collect_items -> confirm_order -> collect_payment -> finalize`
- Enforce read-back confirmation before transition to payment.
- Lock inventory for active orders with timeout-based release.

### 2) Voice Quality + Guardrails
- Domain phrase list (products, neighborhoods, common names).
- Confidence threshold routing:
  - high confidence => auto-fill
  - medium => ask clarifying question
  - low => immediate manual takeover
- Block ambiguous quantities until explicit confirmation.

### 3) Customer + Order Data Model
- Idempotency key per call session to prevent duplicate orders.
- Caller-ID profile preload with last order suggestion.
- Immutable audit events for every state transition.

### 4) Twilio Pay DTMF Integration
- Start DTMF payment only after total is confirmed.
- On success: persist payment token/reference + mark paid.
- On failure: one retry, then manual workflow queue.
- Capture reason codes for declined/abandoned attempts.

### 5) Missed-Call and Callback Operations
- Every missed call creates callback task with priority score.
- SLA tiers:
  - critical repeat buyer: callback <= 5 min
  - standard: callback <= 15 min
- Escalation rule if callback attempts exceed threshold.

### 6) Dashboard and Alerting
- Daily KPIs:
  - answered calls
  - missed calls
  - average order duration
  - payment success rate
  - manual fallback rate
- Alerts:
  - payment success rate < 95%
  - queue wait > SLA
  - API 5xx burst

### 7) Security + Compliance Controls
- Secret management via environment/injected runtime secrets only.
- Role-based dashboard access; write operations require authenticated users.
- PII minimization and transcript redaction for sensitive snippets.
- Data retention windows for logs, transcripts, and payment metadata.

## Cutover Plan (Production)

### Phase A - Hardening (Days 1-5)
- Stabilize state machine, idempotency, retries, and fallback logic.
- Implement Twilio Pay DTMF success/failure handling and logging.

### Phase B - Staging Validation (Days 6-8)
- Load test peak call volume with synthetic traffic.
- Run failure-injection drills (ASR errors, POS latency, payment declines).

### Phase C - Pilot (Days 9-10)
- Roll out to 1-2 stores with on-call operator shadowing.
- Verify KPI thresholds and incident response timing.

### Phase D - Full Production (Day 11+)
- Expand to all stores with live monitoring and daily quality reviews.

## Pre-Go-Live Checklist
- [ ] Twilio Pay DTMF flow validated end-to-end in staging
- [ ] Payment failure fallback script approved by ops
- [ ] Inventory lock + timeout tested under concurrency
- [ ] Callback queue SLA automation verified
- [ ] Alerts wired to on-call channel
- [ ] Runbook + rollback plan distributed to support team
- [ ] Staff script and escalation matrix signed off

## Day-1 Runbook Essentials
- Verify service health and queue depth at open.
- Monitor first 50 calls manually for quality drift.
- Trigger immediate rollback if payment completion drops below threshold.
- Run end-of-day review: top errors, corrective actions, owner assignment.
