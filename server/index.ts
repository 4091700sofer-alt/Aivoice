import express from 'express';
import twilio from 'twilio';
import { config, validateRuntimeConfig } from './config';
import { initDb, pool } from './db';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function requireAgentAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const expected = config.agentApiKey;
  const headerKey = req.header('x-agent-api-key');
  const bearer = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  const provided = headerKey || bearer;

  if (!expected || !provided || provided !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

function requireTwilioSignature(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!config.twilioAuthToken) {
    return res.status(500).json({ error: 'TWILIO_AUTH_TOKEN is required' });
  }

  const signature = req.header('x-twilio-signature');
  if (!signature) {
    return res.status(401).json({ error: 'Missing Twilio signature' });
  }

  const host = req.header('host');
  const protocol = req.header('x-forwarded-proto') || req.protocol;
  const publicBaseUrl = config.baseUrl || `${protocol}://${host}`;
  const fullUrl = `${publicBaseUrl}${req.originalUrl}`;

  const isValid = twilio.validateRequest(config.twilioAuthToken, signature, fullUrl, req.body || {});
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid Twilio signature' });
  }

  return next();
}

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'voice-pos-api' });
});

app.post('/api/orders', requireAgentAuth, async (req, res) => {
  const { customerName, phone, items, totalCents } = req.body;
  if (!customerName || !phone || !Array.isArray(items) || typeof totalCents !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  if (!pool) {
    return res.status(500).json({ error: 'DATABASE_URL is required' });
  }

  const result = await pool.query(
    `INSERT INTO orders (customer_name, phone, items, total_cents)
     VALUES ($1, $2, $3::jsonb, $4)
     RETURNING id, customer_name, phone, items, total_cents, status, payment_status, created_at`,
    [customerName, phone, JSON.stringify(items), totalCents],
  );

  return res.status(201).json(result.rows[0]);
});

app.get('/api/orders/:id', requireAgentAuth, async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'DATABASE_URL is required' });
  }

  const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!result.rowCount) {
    return res.status(404).json({ error: 'Order not found' });
  }
  return res.json(result.rows[0]);
});

app.post('/api/orders/:id/payment-dtmf', requireAgentAuth, async (req, res) => {
  if (!config.twilioPayConnector) {
    return res.status(500).json({ error: 'TWILIO_PAY_CONNECTOR is required' });
  }

  const voiceResponse = new twilio.twiml.VoiceResponse();
  const pay = voiceResponse.pay({
    paymentConnector: config.twilioPayConnector,
    chargeAmount: req.body?.chargeAmount || '1.00',
    currency: 'USD',
    action: `/api/orders/${req.params.id}/payment-dtmf/callback`,
    paymentMethod: 'credit-card',
  });


  res.type('text/xml').send(voiceResponse.toString());
});

app.post('/api/twilio/voice', requireTwilioSignature, (_req, res) => {
  const voiceResponse = new twilio.twiml.VoiceResponse();
  voiceResponse.say('Welcome to voice point of sale. Enter your order ID followed by pound to pay now.');

  voiceResponse.gather({
    action: '/api/twilio/voice/route-payment',
    method: 'POST',
    finishOnKey: '#',
    numDigits: 10,
  });

  voiceResponse.say('No input received. Goodbye.');
  voiceResponse.hangup();

  res.type('text/xml').send(voiceResponse.toString());
});

app.post('/api/twilio/voice/route-payment', requireTwilioSignature, (req, res) => {
  const orderId = String(req.body?.Digits || '').trim();
  const voiceResponse = new twilio.twiml.VoiceResponse();

  if (!/^\d+$/.test(orderId)) {
    voiceResponse.say('Invalid order ID. Please contact the store.');
    voiceResponse.hangup();
    return res.type('text/xml').send(voiceResponse.toString());
  }

  voiceResponse.redirect({ method: 'POST' }, `/api/orders/${orderId}/payment-dtmf/twilio`);
  return res.type('text/xml').send(voiceResponse.toString());
});


app.post('/api/orders/:id/payment-dtmf/twilio', requireTwilioSignature, async (req, res) => {
  if (!config.twilioPayConnector) {
    return res.status(500).json({ error: 'TWILIO_PAY_CONNECTOR is required' });
  }

  const voiceResponse = new twilio.twiml.VoiceResponse();
  const pay = voiceResponse.pay({
    paymentConnector: config.twilioPayConnector,
    chargeAmount: req.body?.chargeAmount || '1.00',
    currency: 'USD',
    action: `/api/orders/${req.params.id}/payment-dtmf/callback`,
    paymentMethod: 'credit-card',
  });


  res.type('text/xml').send(voiceResponse.toString());
});

app.post('/api/orders/:id/payment-dtmf/callback', requireTwilioSignature, async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'DATABASE_URL is required' });
  }

  const paymentResult = req.body?.Result;
  const paymentConfirmationCode = req.body?.PaymentConfirmationCode || null;
  const status = paymentResult === 'success' ? 'paid' : 'failed';

  await pool.query('UPDATE orders SET payment_status = $1, payment_ref = $2 WHERE id = $3', [
    status,
    paymentConfirmationCode,
    req.params.id,
  ]);

  const voiceResponse = new twilio.twiml.VoiceResponse();
  voiceResponse.say(status === 'paid' ? 'Payment successful. Thank you.' : 'Payment failed. Please contact store support.');
  res.type('text/xml').send(voiceResponse.toString());
});

async function main() {
  validateRuntimeConfig();
  await initDb();
  app.listen(config.port, () => {
    console.log(`Voice POS API listening on port ${config.port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
