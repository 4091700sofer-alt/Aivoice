export const config = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL,
  databaseUrl: process.env.DATABASE_URL,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
  twilioPayConnector: process.env.TWILIO_PAY_CONNECTOR,
  agentApiKey: process.env.AGENT_API_KEY,
};

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function validateRuntimeConfig() {
  requireEnv('DATABASE_URL');

  if (config.nodeEnv === 'production') {
    requireEnv('AGENT_API_KEY');
    requireEnv('TWILIO_ACCOUNT_SID');
    requireEnv('TWILIO_AUTH_TOKEN');
    requireEnv('TWILIO_PHONE_NUMBER');
    requireEnv('TWILIO_PAY_CONNECTOR');
  }
}
