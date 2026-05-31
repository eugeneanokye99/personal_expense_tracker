import axios from 'axios';
import { env } from './env';

const ARKESEL_BASE_URL = 'https://sms.arkesel.com/api/v2';

interface ArkeselResponse {
  status: string;
  data: Array<{ recipient: string; id: string }>;
}

/**
 * Send an SMS via Arkesel (Ghana SMS gateway — https://arkesel.com).
 * Phone numbers should be in international format: +233XXXXXXXXX
 */
export async function sendSms(to: string, message: string): Promise<void> {
  // Normalise Ghana phone number to international format
  const phone = normaliseGhanaPhone(to);

  const response = await axios.post<ArkeselResponse>(
    `${ARKESEL_BASE_URL}/sms/send`,
    {
      sender: env.ARKESEL_SENDER_ID,
      message,
      recipients: [phone],
    },
    {
      headers: {
        'api-key': env.ARKESEL_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    },
  );

  if (response.data.status !== 'success') {
    throw new Error(`Arkesel SMS failed: ${JSON.stringify(response.data)}`);
  }
}

/**
 * Normalise Ghanaian phone numbers to +233 format.
 * Accepts: 0244123456, 244123456, +233244123456
 */
function normaliseGhanaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('233')) return digits;
  if (digits.startsWith('0')) return `233${digits.slice(1)}`;
  return `233${digits}`;
}
