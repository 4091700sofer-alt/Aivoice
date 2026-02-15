import twilio from 'twilio';
import { config } from './config';

export async function sendSMS(to: string, body: string) {
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber) {
    return { success: false, error: 'Twilio is not configured' };
  }

  const client = twilio(config.twilioAccountSid, config.twilioAuthToken);

  try {
    const result = await client.messages.create({
      to,
      body,
      from: config.twilioPhoneNumber,
    });
    return { success: true, sid: result.sid };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
