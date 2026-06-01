import pdfParse from 'pdf-parse';
import { resolveCategory } from './merchantMap';

export interface ParsedTransaction {
  amount: number;
  category: string;
  merchant: string;
  date: string; // ISO string
  transactionType: 'debit' | 'credit';
  channel: 'MTN MoMo' | 'Telecel Cash' | 'AirtelTigo Money' | 'Other';
  confidence: number;
}

export class MomoParser {
  /**
   * Parse an uploaded statement file buffer (PDF or CSV) and extract transactions
   */
  static async parseStatement(fileBuffer: Buffer, mimeType: string): Promise<ParsedTransaction[]> {
    let rawText = '';

    if (mimeType.includes('pdf')) {
      try {
        if (typeof (pdfParse as any).PDFParse === 'function') {
          // New modern 'pdf-parse' package by Mehmet Kozan (TypeScript rewrite)
          const instance = new (pdfParse as any).PDFParse(fileBuffer);
          const parsedPdf = await instance.getText();
          rawText = parsedPdf.text;
        } else {
          // Old classic 'pdf-parse' package
          const parseFn = typeof pdfParse === 'function' ? pdfParse : (pdfParse as any).default;
          if (typeof parseFn !== 'function') {
            throw new Error('pdf-parse is not imported as a function');
          }
          const parsedPdf = await parseFn(fileBuffer);
          rawText = parsedPdf.text;
        }
      } catch (err) {
        console.error('Failed to extract text from PDF statement:', err);
        throw new Error('Could not parse PDF statement file.');
      }
    } else {
      // Treat as CSV / Text
      rawText = fileBuffer.toString('utf8');
    }

    return MomoParser.parseText(rawText);
  }

  /**
   * Parse extracted statement raw text into structured transactions
   */
  static parseText(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text.split('\n');

    // Detect Channel (MTN vs Telecel vs AirtelTigo)
    let channel: 'MTN MoMo' | 'Telecel Cash' | 'AirtelTigo Money' | 'Other' = 'MTN MoMo';
    const lowerText = text.toLowerCase();
    if (lowerText.includes('telecel') || lowerText.includes('telecel cash') || lowerText.includes('vodafone')) {
      channel = 'Telecel Cash';
    } else if (lowerText.includes('airteltigo') || lowerText.includes('airtel') || lowerText.includes('tigo')) {
      channel = 'AirtelTigo Money';
    }

    // Common date patterns: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
    const dateRegex = /(\d{2}[-/]\d{2}[-/]\d{4})|(\d{4}-\d{2}-\d{2})/g;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Let's check for transaction indicators: GHS or ₵ followed by amount
      // We look for amounts, e.g., "GHS 120.00" or "GHS120" or "₵ 50.00" or simple decimals like "25.00"
      const amountMatch = /(?:GHS|₵)\s*([\d,]+\.\d{2})/i.exec(trimmedLine) || /\b([\d,]+\.\d{2})\b/.exec(trimmedLine);
      if (!amountMatch) continue;

      const parsedAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (isNaN(parsedAmount) || parsedAmount <= 0) continue;

      // Extract transaction type: Debit (Sent, Withdrawal, Payment, Cash Out) vs Credit (Received, Deposit, Cash In)
      let transactionType: 'debit' | 'credit' = 'debit';
      const lowercaseLine = trimmedLine.toLowerCase();

      if (
        lowercaseLine.includes('received') ||
        lowercaseLine.includes('deposit') ||
        lowercaseLine.includes('credit') ||
        lowercaseLine.includes('cash in') ||
        lowercaseLine.includes('refund')
      ) {
        transactionType = 'credit';
      }

      // Extract date from the line
      let txDate = new Date();
      const dateMatch = trimmedLine.match(dateRegex);
      if (dateMatch && dateMatch[0]) {
        txDate = MomoParser.parseDateString(dateMatch[0]);
      }

      // Extract Merchant / Recipient
      // Match text after sent/to/from/received/payment
      let merchant = 'Unknown Merchant';
      const merchantMatch = /(?:sent to|payment to|received from|transfer to|paid to|from|agent)\s+([A-Za-z0-9\s&_.'-]+?)(?=\s+(?:GHS|₵|\d|Reference|Success|$))/i.exec(trimmedLine);
      
      if (merchantMatch && merchantMatch[1]) {
        merchant = merchantMatch[1].trim().replace(/\s+/g, ' ');
      } else {
        // Fallback: extract alphabetical words in the line that aren't keywords
        const words = trimmedLine.split(/\s+/).filter(w => 
          /^[A-Za-z]+$/.test(w) && 
          !['GHS', 'SUCCESS', 'TRANSACTION', 'DEBIT', 'CREDIT', 'SENT', 'RECEIVED', 'TRANSFER', 'MOBILE', 'MONEY'].includes(w.toUpperCase())
        );
        if (words.length > 0) {
          merchant = words.slice(0, 3).join(' ');
        }
      }

      // Map Category
      const category = resolveCategory(merchant, {});

      // Calculate confidence score (confidence defaults to 90 if successfully parsed all core fields)
      let confidence = 70;
      if (dateMatch) confidence += 10;
      if (merchantMatch) confidence += 10;
      if (category !== 'Other') confidence += 10;

      // Cap confidence at 100
      confidence = Math.min(100, confidence);

      transactions.push({
        amount: parsedAmount,
        category,
        merchant,
        date: txDate.toISOString(),
        transactionType,
        channel,
        confidence,
      });
    }

    return transactions;
  }

  /**
   * Helper to parse dates in different local formats (DD/MM/YYYY, DD-MM-YYYY)
   */
  private static parseDateString(dateStr: string): Date {
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return new Date();

    // Check if YYYY-MM-DD
    if (parts[0].length === 4) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      return new Date(year, month, day);
    }

    // Default DD/MM/YYYY or DD-MM-YYYY
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
  }
}
