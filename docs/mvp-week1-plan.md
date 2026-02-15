# AI Voice POS - 1 Week Build Plan (Flip-Phone Stores)

## Scope Lock
- Primary channel: inbound phone calls
- Customers: flip-phone / no internet users
- POS integration: local custom POS
- Payment method: **Twilio Pay with DTMF only** (no Stripe links, no web checkout)

## Top 10 Build Items
1. Fast call-to-order capture flow with save-under-60-seconds target.
2. Voice-to-text tuned for local language and accent handling.
3. Mandatory order read-back confirmation before save.
4. Caller ID lookup to auto-load repeat customer data.
5. Real-time inventory check and lock while call is active.
6. Limited production command set (10-15 commands) for reliability.
7. 1-tap fallback to manual order mode when AI confidence is low.
8. Missed-call callback queue with SLA priority flags.
9. Daily quality dashboard (missed calls, correction rate, average order time).
10. One-page staff SOP and launch-day script.

## Payment Implementation (DTMF via Twilio Pay)
- Trigger point: after order total confirmation.
- IVR prompt asks caller to enter payment details via keypad.
- Twilio Pay securely captures card input through DTMF.
- Agent receives payment success/failure tokenized result only.
- On failure, caller can retry once, then route to manual fallback.

## Week-1 Delivery Breakdown
- Day 1-2: Order capture, customer lookup, manual fallback
- Day 3: STT tuning, confirmation script, inventory lock
- Day 4: Missed-call queue + callback workflow
- Day 5: Twilio Pay DTMF flow + failure handling
- Day 6: Dashboard metrics + operator SOP
- Day 7: Pilot in 1-2 stores and patch top defects
