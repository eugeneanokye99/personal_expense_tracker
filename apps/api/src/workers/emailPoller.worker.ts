import { google } from 'googleapis';
import { supabase } from '../config/database';
import { redis } from '../config/redis';
import { publishToQueue, QUEUES } from '../config/rabbitmq';
import { decryptToken, getGmailOAuthClient } from '../modules/auth/gmail.oauth';
import { encryptToken } from '../modules/auth/gmail.oauth';
import type { EmailPollMessage, EmailParseMessage } from '../../../../packages/shared/types';

/**
 * Polls a connected Gmail account for new transaction emails using
 * incremental sync (historyId) — only fetches messages added since last scan.
 */
export async function emailPollerWorker(msg: object): Promise<void> {
  const { emailAccountId, userId, provider } = msg as EmailPollMessage;

  if (provider !== 'gmail') {
    console.warn(`Unsupported provider: ${provider}`);
    return;
  }

  // Prevent duplicate concurrent polls on the same account
  const lockKey = `email:poll:lock:${emailAccountId}`;
  const locked = await redis.set(lockKey, '1', 'EX', 900, 'NX');
  if (!locked) {
    console.log(`Poll already running for account ${emailAccountId}, skipping`);
    return;
  }

  try {
    const { data: account } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', emailAccountId)
      .eq('is_active', true)
      .single();

    if (!account) {
      console.warn(`Email account ${emailAccountId} not found or inactive`);
      return;
    }

    // Refresh access token if expired
    const accessToken = await ensureFreshToken(account);

    const auth = getGmailOAuthClient();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    // Incremental sync — only fetch history since last scan
    const historyResult = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: account.history_id,
      historyTypes: ['messageAdded'],
    });

    const messages = historyResult.data.history?.flatMap(h => h.messagesAdded ?? []) ?? [];

    for (const entry of messages) {
      const messageId = entry.message?.id;
      if (!messageId) continue;

      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const headers = fullMessage.data.payload?.headers ?? [];
      const senderEmail = headers.find(h => h.name === 'From')?.value ?? '';
      const subject = headers.find(h => h.name === 'Subject')?.value ?? '';
      const bodyText = extractTextBody(fullMessage.data.payload);

      const parseMsg: EmailParseMessage = {
        emailAccountId,
        userId,
        gmailMessageId: messageId,
        senderEmail,
        subject,
        bodyText,
        receivedAt: new Date().toISOString(),
      };

      await publishToQueue(QUEUES.EMAIL_PARSE, parseMsg);
    }

    // Update historyId and lastScannedAt
    const newHistoryId = historyResult.data.historyId ?? account.history_id;
    await supabase
      .from('email_accounts')
      .update({ history_id: newHistoryId, last_scanned_at: new Date().toISOString() })
      .eq('id', emailAccountId);

    console.log(`✉️  Polled ${messages.length} new messages for account ${emailAccountId}`);
  } finally {
    await redis.del(lockKey);
  }
}

async function ensureFreshToken(account: Record<string, string>): Promise<string> {
  const expiry = new Date(account.token_expiry).getTime();
  const fiveMinutes = 5 * 60 * 1000;

  if (Date.now() < expiry - fiveMinutes) {
    return decryptToken(account.access_token_enc);
  }

  // Token expired — refresh
  const client = getGmailOAuthClient();
  client.setCredentials({ refresh_token: decryptToken(account.refresh_token_enc) });
  const { credentials } = await client.refreshAccessToken();

  await supabase.from('email_accounts').update({
    access_token_enc: encryptToken(credentials.access_token!),
    token_expiry: new Date(credentials.expiry_date!).toISOString(),
  }).eq('id', account.id);

  return credentials.access_token!;
}

function extractTextBody(payload: unknown): string {
  // TODO: Recursively extract plain text from MIME parts
  // Handle multipart/alternative, text/plain, text/html
  const p = payload as Record<string, unknown>;
  if (p?.mimeType === 'text/plain' && p?.body) {
    const body = p.body as { data?: string };
    return Buffer.from(body.data ?? '', 'base64url').toString('utf-8');
  }
  const parts = (p?.parts ?? []) as unknown[];
  for (const part of parts) {
    const text = extractTextBody(part);
    if (text) return text;
  }
  return '';
}
