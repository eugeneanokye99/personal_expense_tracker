import { resolveCategory } from './merchantMap';

export interface GhanaEmailSender {
  channel: string;
  amountPattern: RegExp;
  merchantPattern: RegExp;
  debitKeywords: string[];
  creditKeywords: string[];
}

export const GHANA_SENDERS: Record<string, GhanaEmailSender> = {
  'mtn-momo@mtn.com.gh': {
    channel: 'MTN MoMo',
    amountPattern: /GHS\s?([\d,]+\.?\d{0,2})/i,
    merchantPattern: /(?:to|from)\s+([A-Za-z0-9\s&.'-]+?)(?:\s+on|\s+at|$)/i,
    debitKeywords: ['sent', 'payment', 'debit', 'withdrawn'],
    creditKeywords: ['received', 'credit', 'deposited'],
  },
  'alerts@gcbbank.com.gh': {
    channel: 'GCB Bank',
    amountPattern: /GHS([\d,]+\.?\d{0,2})/i,
    merchantPattern: /at\s+([A-Za-z0-9\s&.'-]+?)(?:\.|$)/i,
    debitKeywords: ['debit', 'withdrawal', 'payment', 'purchase'],
    creditKeywords: ['credit', 'deposit', 'received'],
  },
  'notifications@ecobank.com': {
    channel: 'Ecobank',
    amountPattern: /GHS\s?([\d,]+\.?\d{0,2})/i,
    merchantPattern: /(?:merchant|at|to)\s+([A-Za-z0-9\s&.'-]+?)(?:\s|$)/i,
    debitKeywords: ['debit', 'payment', 'purchase'],
    creditKeywords: ['credit', 'received'],
  },
  'no-reply@fidelitybank.com.gh': {
    channel: 'Fidelity Bank',
    amountPattern: /GHS\s?([\d,]+\.?\d{0,2})/i,
    merchantPattern: /(?:at|from|to)\s+([A-Za-z0-9\s&.'-]+)/i,
    debitKeywords: ['debited', 'withdrawal'],
    creditKeywords: ['credited', 'deposit'],
  },
  'alerts@absa.com.gh': {
    channel: 'Absa Ghana',
    amountPattern: /GHS\s?([\d,]+\.?\d{0,2})/i,
    merchantPattern: /at\s+([A-Za-z0-9\s&.'-]+?)(?:\.|,|$)/i,
    debitKeywords: ['debit', 'purchase'],
    creditKeywords: ['credit', 'received'],
  },
};

export interface ParsedTransaction {
  amount: number;
  merchant: string;
  category: string;
  transactionType: 'debit' | 'credit';
  channel: string;
  confidence: number;
}

export function parseGhanaEmail(
  senderEmail: string,
  subject: string,
  body: string,
  userOverrides: Record<string, string> = {},
): ParsedTransaction | null {
  const config = GHANA_SENDERS[senderEmail.toLowerCase()];
  if (!config) return null;

  let confidence = 20; // known sender = base 20 points

  const amountMatch = (body + ' ' + subject).match(config.amountPattern);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
  if (amount) confidence += 40;

  const merchantMatch = (body + ' ' + subject).match(config.merchantPattern);
  const merchant = merchantMatch ? merchantMatch[1].trim() : 'Unknown';
  if (merchant !== 'Unknown') confidence += 20;

  const combinedText = (subject + ' ' + body).toLowerCase();
  const isDebit = config.debitKeywords.some(k => combinedText.includes(k));
  const isCredit = config.creditKeywords.some(k => combinedText.includes(k));
  const transactionType: 'debit' | 'credit' = isCredit && !isDebit ? 'credit' : 'debit';
  if (isDebit || isCredit) confidence += 20;

  if (!amount) return null;

  const category = resolveCategory(merchant, userOverrides);

  return { amount, merchant, category, transactionType, channel: config.channel, confidence };
}
