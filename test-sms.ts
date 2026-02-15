import { sendSMS } from './server/twilio';

async function test() {
  console.log('Sending test SMS to +19294091700...');
  const result = await sendSMS('+19294091700', 'Test from Satmar Matzah Bakery - Twilio is working!');
  console.log('Result:', result);
  process.exit(result.success ? 0 : 1);
}

test();
