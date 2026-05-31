import { supabase } from '../config/database';
import { publishToQueue, QUEUES } from '../config/rabbitmq';
import { parseGhanaEmail } from '../engine/emailParser';
import { resolveCategory } from '../engine/merchantMap';
import type { EmailParseMessage } from '../../../../packages/shared/types';

const HIGH_CONFIDENCE_THRESHOLD = 85;

/**
 * Parses a raw Gmail message body for Ghana bank transaction details.
 * High confidence (≥85) → auto-save expense.
 * Low confidence (<85) → save as pending for user confirmation.
 */
export async function emailParserWorker(msg: object): Promise<void> {
  const { emailAccountId, userId, gmailMessageId, senderEmail, subject, bodyText, receivedAt } =
    msg as EmailParseMessage;

  // Fetch user-specific merchant overrides for better category accuracy
  const { data: overrides } = await supabase
    .from('merchant_category_overrides')
    .select('merchant, category')
    .eq('user_id', userId);

  const overrideMap: Record<string, string> = Object.fromEntries(
    (overrides ?? []).map(o => [o.merchant, o.category]),
  );

  const parsed = parseGhanaEmail(senderEmail, subject, bodyText, overrideMap);

  if (!parsed) {
    console.log(`No parser match for sender: ${senderEmail}`);
    return;
  }

  if (parsed.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    // Auto-save — check dedup first
    const { data: existing } = await supabase
      .from('expenses')
      .select('id')
      .eq('user_id', userId)
      .eq('email_message_id', gmailMessageId)
      .single();

    if (existing) {
      console.log(`Duplicate email ${gmailMessageId}, skipping`);
      return;
    }

    const { data: expense } = await supabase
      .from('expenses')
      .insert({
        user_id: userId,
        amount: parsed.amount,
        category: resolveCategory(parsed.merchant, overrideMap),
        merchant: parsed.merchant,
        date: receivedAt,
        source: 'email',
        transaction_type: parsed.transactionType,
        channel: parsed.channel,
        email_message_id: gmailMessageId,
      })
      .select()
      .single();

    // Trigger pattern check for this new expense
    if (expense) {
      await publishToQueue(QUEUES.PATTERN_CHECK, {
        userId,
        expenseId: expense.id,
        category: expense.category,
        merchant: expense.merchant,
        amount: expense.amount,
        date: expense.date,
      });
    }

    console.log(`✅ Auto-saved expense: ${parsed.merchant} ₵${parsed.amount} (confidence: ${parsed.confidence}%)`);
  } else {
    // Low confidence — save as pending for user confirmation
    await supabase.from('pending_email_transactions').insert({
      user_id: userId,
      email_account_id: emailAccountId,
      gmail_message_id: gmailMessageId,
      parsed_amount: parsed.amount,
      merchant: parsed.merchant,
      suggested_category: parsed.category,
      transaction_type: parsed.transactionType,
      channel: parsed.channel,
      confidence: parsed.confidence,
      status: 'pending',
    });

    console.log(`⚠️  Low confidence (${parsed.confidence}%) — saved as pending: ${parsed.merchant} ₵${parsed.amount}`);
  }
}
