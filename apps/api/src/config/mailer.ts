import nodemailer from 'nodemailer';
import { env } from './env';

// Create Nodemailer Transporter using validated SMTP settings
export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE, // true for port 465, false for 587 or 2525
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

/**
 * Resilient helper function to send outbound emails.
 * Wraps transporter in a try/catch so that SMTP failures do not crash backend workers.
 */
export async function sendMail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'), // Simple HTML fallback wrapper
    });
    console.log(`✉️ Email successfully sent to ${to}. Message ID: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
    return false;
  }
}
