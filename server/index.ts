import express from 'express';
import { config } from './config';
import { initDb, pool } from './db';
import twilio from 'twilio';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'voice-pos-api' });
});

app.post('/api/orders', async (req, res) => {
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

app.get('/api/orders/:id', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'DATABASE_URL is required' });
  }

  const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!result.rowCount) {
    return res.status(404).json({ error: 'Order not found' });
  }
  return res.json(result.rows[0]);
});

app.post('/api/orders/:id/payment-dtmf', async (req, res) => {
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

  pay.prompt({ for: 'payment-card-number' }, 'Please enter your card number followed by pound.');
  pay.prompt({ for: 'expiration-date' }, 'Please enter expiration date as four digits.');
  pay.prompt({ for: 'security-code' }, 'Please enter your security code.');
  pay.prompt({ for: 'postal-code' }, 'Please enter your billing zip code.');

  res.type('text/xml').send(voiceResponse.toString());
});

app.post('/api/orders/:id/payment-dtmf/callback', async (req, res) => {
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
  voiceResponse.say(status === 'paid' ? 'Payment successful. Thank you.' : 'Payment failed. Please try again.');
  res.type('text/xml').send(voiceResponse.toString());
});

async function main() {
  await initDb();
  app.listen(config.port, () => {
    console.log(`Voice POS API listening on port ${config.port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
