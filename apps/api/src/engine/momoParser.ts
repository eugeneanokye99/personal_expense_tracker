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
  reference?: string;
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
          const instance = new (pdfParse as any).PDFParse(new Uint8Array(fileBuffer));
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
    
    // Detect Channel (MTN vs Telecel vs AirtelTigo)
    let channel: 'MTN MoMo' | 'Telecel Cash' | 'AirtelTigo Money' | 'Other' = 'MTN MoMo';
    const lowerText = text.toLowerCase();
    if (lowerText.includes('telecel') || lowerText.includes('telecel cash') || lowerText.includes('vodafone')) {
      channel = 'Telecel Cash';
    } else if (lowerText.includes('airteltigo') || lowerText.includes('airtel') || lowerText.includes('tigo')) {
      channel = 'AirtelTigo Money';
    }

    // 1. Detect account holder to filter from merchants list
    let accountHolder = '';
    const accountHolderMatch = /Account holder:\s*([A-Za-z\s]+)(?=\n|Wallet|$)/i.exec(text) ||
                              /Statement Details\s*([A-Za-z\s]+)(?=\n|Subscriber|$)/i.exec(text);
    if (accountHolderMatch && accountHolderMatch[1]) {
      accountHolder = accountHolderMatch[1].trim().replace(/\s+/g, ' ');
    }

    // 2. Preprocess text to merge awkwardly split lines
    const preprocessedText = MomoParser.preprocessText(text);

    // We split into lines
    const lines = preprocessedText.split('\n').map(l => l.trim()).filter(Boolean);

    // List of lines that are not matched horizontally, to be used in fallback vertical matching
    const unmatchedLines: string[] = [];

    // Let's first try to parse complete horizontal lines
    const mtnDateRegex = /\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/i;
    const standardDateRegex = /(\d{2}[-/]\d{2}[-/]\d{4})|(\d{4}-\d{2}-\d{2})/;
    const timeRegex = /\b\d{2}:\d{2}(?::\d{2})?\b/;

    for (const line of lines) {
      const dateMatch = line.match(mtnDateRegex) || line.match(standardDateRegex);
      const timeMatch = line.match(timeRegex);

      if (dateMatch && timeMatch) {
        // Line has date and time. Does it also have a signed amount or GHS amount?
        const signedAmountMatch = /([-+])\s*([\d,]+\.\d{2})\b/.exec(line);
        const ghsAmountMatch = /(?:GHS|₵)\s*([\d,]+\.\d{2})\b/i.exec(line);

        if (signedAmountMatch || ghsAmountMatch) {
          // Yes! This is a complete horizontal line. Parse it!
          const tx = MomoParser.parseHorizontalLine(line, dateMatch[0], timeMatch[0], channel, accountHolder);
          if (tx) {
            transactions.push(tx);
            continue; // Mark as processed
          }
        }
      }

      unmatchedLines.push(line);
    }

    // 3. Fallback: Parse remaining vertical blocks (e.g. from the columnised PDF structure)
    const fallbackTxs = MomoParser.parseVerticalFallback(unmatchedLines, channel, accountHolder);
    transactions.push(...fallbackTxs);

    // 4. Fallback 2: If we didn't find any transaction, try a simplified regex on all lines
    if (transactions.length === 0) {
      for (const line of lines) {
        const dateMatch = line.match(standardDateRegex) || line.match(mtnDateRegex);
        const amountMatch = /(?:GHS|₵)\s*([\d,]+\.\d{2})/i.exec(line) || /\b([\d,]+\.\d{2})\b/.exec(line);
        if (!amountMatch) continue;

        const parsedAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
        if (isNaN(parsedAmount) || parsedAmount <= 0) continue;

        let transactionType: 'debit' | 'credit' = 'debit';
        const lowercaseLine = line.toLowerCase();
        if (
          lowercaseLine.includes('received') ||
          lowercaseLine.includes('deposit') ||
          lowercaseLine.includes('credit') ||
          lowercaseLine.includes('cash in') ||
          lowercaseLine.includes('refund')
        ) {
          transactionType = 'credit';
        }

        let txDate = new Date();
        if (dateMatch) {
          txDate = MomoParser.parseDateString(dateMatch[0]);
        }

        // Extrapolate merchant
        let merchant = 'Unknown Merchant';
        const merchantMatch = /(?:sent to|payment to|received from|transfer to|paid to|from|agent)\s+([A-Za-z0-9\s&_.'-]+?)(?=\s+(?:GHS|₵|\d|Reference|Success|$))/i.exec(line);
        if (merchantMatch && merchantMatch[1]) {
          merchant = merchantMatch[1].trim().replace(/\s+/g, ' ');
        } else {
          const words = line.split(/\s+/).filter(w => 
            /^[A-Za-z]+$/.test(w) && 
            !['GHS', 'SUCCESS', 'TRANSACTION', 'DEBIT', 'CREDIT', 'SENT', 'RECEIVED', 'TRANSFER', 'MOBILE', 'MONEY'].includes(w.toUpperCase())
          );
          if (words.length > 0) {
            merchant = words.slice(0, 3).join(' ');
          }
        }

        transactions.push({
          amount: parsedAmount,
          category: resolveCategory(merchant, {}),
          merchant,
          date: txDate.toISOString(),
          transactionType,
          channel,
          confidence: 70,
        });
      }
    }

    // Sort by date descending
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Merges multi-line split column layout tokens into readable records
   */
  private static preprocessText(text: string): string {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const normalizedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let current = lines[i];

      // Merge phone number blocks (e.g. current is "+233 54 49" and next is "11 90 2")
      if (
        current.match(/^\+233\s*\d{2}\s*\d{2}$/) &&
        lines[i + 1] &&
        lines[i + 1].match(/^\d{2}\s*\d{2}\s*\d$/)
      ) {
        current += ' ' + lines[i + 1];
        i++;
      }
      // Merge split name parts (e.g. current is "GEORGE OPOKU" and next is "AFRIYIE-5.00")
      else if (
        current.match(/^[A-Z\s]+$/) &&
        !['DEBIT', 'CREDIT', 'CASH OUT', 'AIRTIME', 'MOMO USER', 'OTHER NETWORKS', 'OTHER TRANSACTIONS', 'GHANAPAY PUSH'].includes(current.toUpperCase()) &&
        lines[i + 1] &&
        lines[i + 1].match(/^[A-Z\s]+(?:[-+]\d+(?:\.\d{2})?)?$/) &&
        !lines[i + 1].match(/^\d{1,2}\s+[A-Za-z]{3}/) // not a date
      ) {
        current += ' ' + lines[i + 1];
        i++;
      }
      // Merge split name parts 3-levels (e.g. "EUGENE DOKYE" then "ANOKYE" then ",03xxxxxx12...")
      else if (
        current.match(/^[A-Z\s]+$/) &&
        lines[i + 1] &&
        lines[i + 1].match(/^[A-Z\s]+$/) &&
        lines[i + 2] &&
        lines[i + 2].match(/^,\d+xxxxxx/)
      ) {
        current += ' ' + lines[i + 1] + ' ' + lines[i + 2];
        i += 2;
      }
      // Merge references starting with "Packet for"
      else if (
        current.startsWith('Packet for') &&
        lines[i + 1] &&
        !lines[i + 1].match(/^\d{1,2}\s+[A-Za-z]{3}/)
      ) {
        current += ' ' + lines[i + 1];
        i++;
        if (lines[i + 1] && !lines[i + 1].match(/^\d{1,2}\s+[A-Za-z]{3}/)) {
          current += ' ' + lines[i + 1];
          i++;
        }
      }
      // Merge references starting with "transfer with ref:"
      else if (
        current.startsWith('transfer with ref:') &&
        lines[i + 1] &&
        !lines[i + 1].match(/^\d{1,2}\s+[A-Za-z]{3}/)
      ) {
        current += ' ' + lines[i + 1];
        i++;
        if (lines[i + 1] && !lines[i + 1].match(/^\d{1,2}\s+[A-Za-z]{3}/)) {
          current += ' ' + lines[i + 1];
          i++;
        }
      }

      normalizedLines.push(current);
    }

    return normalizedLines.join('\n');
  }

  /**
   * Helper to parse a single horizontally aligned transaction row
   */
  private static parseHorizontalLine(
    line: string,
    dateStr: string,
    timeStr: string,
    channel: 'MTN MoMo' | 'Telecel Cash' | 'AirtelTigo Money' | 'Other',
    accountHolder: string
  ): ParsedTransaction | null {
    let cleanLine = line;

    // 1. Extract and clean Date/Time
    const dateObj = MomoParser.parseDateStringWithTime(dateStr, timeStr);

    // Remove date and time from the line
    cleanLine = cleanLine.replace(dateStr, '').replace(timeStr, '');

    // 2. Extract Amount and Transaction Type
    let amount = 0;
    let transactionType: 'debit' | 'credit' = 'debit';

    const signedAmountMatch = /([-+])\s*([\d,]+\.\d{2})\b/.exec(cleanLine);
    const ghsAmountMatch = /(?:GHS|₵)\s*([\d,]+\.\d{2})\b/i.exec(cleanLine);

    if (signedAmountMatch) {
      amount = parseFloat(signedAmountMatch[2].replace(/,/g, ''));
      transactionType = signedAmountMatch[1] === '+' ? 'credit' : 'debit';
      cleanLine = cleanLine.replace(signedAmountMatch[0], '');
    } else if (ghsAmountMatch) {
      amount = parseFloat(ghsAmountMatch[1].replace(/,/g, ''));
      const lower = line.toLowerCase();
      if (
        lower.includes('received') ||
        lower.includes('deposit') ||
        lower.includes('credit') ||
        lower.includes('cash in') ||
        lower.includes('refund')
      ) {
        transactionType = 'credit';
      }
      cleanLine = cleanLine.replace(ghsAmountMatch[0], '');
    } else {
      return null;
    }

    // 3. Extract transaction ID
    let txId = '';
    const txIdMatch = /\b(8\d{10,11})\b/.exec(cleanLine);
    if (txIdMatch) {
      txId = txIdMatch[1];
      cleanLine = cleanLine.replace(txId, '');
    }

    // 4. Separate name and reference (do this BEFORE cleaning phone numbers/digits to preserve reference numbers)
    let merchant = 'Unknown Merchant';
    let reference = '';

    // First try standard keywords like Sent to, Received from
    const merchantMatch = /(?:sent to|payment to|received from|transfer to|paid to|from|agent)\s+([A-Za-z0-9\s&_.'-]+?)(?=\s+(?:GHS|₵|\d|Reference|Success|$))/i.exec(line);

    // Look for common reference markers
    const refMarkers = [
      /Packet for Mandate\s+\d+\s+product YELLO\.D/i,
      /Yellosave Autodebit/i,
      /NationalId--/i,
      /transfer with ref:\s+\S+\s+from\s+([A-Za-z\s]+)/i,
      /Transfer from\s+([A-Za-z\s]+)/i,
      /,[\dx]+,FTC for.*$/i,
    ];

    let foundRef = '';
    for (const marker of refMarkers) {
      const match = cleanLine.match(marker);
      if (match) {
        foundRef = match[0];
        reference = match[0].trim();
        cleanLine = cleanLine.replace(match[0], '');
        break;
      }
    }

    // 5. Clean phone numbers completely from the cleanLine (which is now just the merchant part)
    cleanLine = cleanLine.replace(/\+?\d[\d\s]{7,15}\d/g, '');
    cleanLine = cleanLine.replace(/\+?\d{3}\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}\s*\d/g, '');
    cleanLine = cleanLine.replace(/\+?\d{10,15}/g, '');

    // 6. Remove fees, tax, balance keywords and amounts from the cleanLine
    cleanLine = cleanLine.replace(/\b(?:GHS|₵)\b/gi, '');
    cleanLine = cleanLine.replace(/\b[\d,]+\.\d{2}\b/g, ''); // removes any unsigned decimals like balances
    cleanLine = cleanLine.replace(/\b(?:DEBIT|CREDIT|CASH OUT|AIRTIME|MOMO USER|OTHER NETWORKS|OTHER TRANSACTIONS|GHANAPAY PUSH)\b/gi, '');

    if (merchantMatch && merchantMatch[1]) {
      merchant = merchantMatch[1].trim().replace(/\s+/g, ' ');
      const refMatch = line.match(/(?:Reference|Ref):\s*([A-Za-z0-9\s&_.'-]+)/i);
      if (refMatch && refMatch[1]) {
        reference = refMatch[1].trim();
      }
    } else {
      let remaining = cleanLine.replace(/\s+/g, ' ').trim();
      remaining = remaining.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '').trim();

      if (remaining.length > 0) {
        merchant = remaining;
      } else if (foundRef) {
        merchant = foundRef.split(/\s+/).slice(0, 3).join(' ');
      }
    }

    // Clean up generic merchants
    if (
      ['UNKNOWN MERCHANT', 'MOMO USER', 'DEBIT', 'CREDIT', 'INTEROPERABILITY PULL OVA', 'AIRTIME'].includes(merchant.toUpperCase()) &&
      reference
    ) {
      const fromMatch = /from\s+([A-Za-z\s]+)/i.exec(reference);
      if (fromMatch && fromMatch[1]) {
        merchant = fromMatch[1].trim();
      }
    }

    if (accountHolder && merchant.toLowerCase() === accountHolder.toLowerCase()) {
      merchant = 'Self Transfer';
    }

    return {
      amount,
      category: resolveCategory(merchant, {}),
      merchant,
      date: dateObj.toISOString(),
      transactionType,
      channel,
      confidence: 95,
      reference: reference || undefined,
    };
  }

  /**
   * Helper to parse vertically columnised statement sections
   */
  private static parseVerticalFallback(
    lines: string[],
    channel: 'MTN MoMo' | 'Telecel Cash' | 'AirtelTigo Money' | 'Other',
    accountHolder: string
  ): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];

    const mtnDateRegex = /\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/i;
    const timeRegex = /\b(\d{2}:\d{2}(?::\d{2})?)\b/;

    const dateMatches: { dateStr: string; timeStr: string }[] = [];
    const signedAmounts: { sign: string; amount: number }[] = [];
    const extractedNames: string[] = [];
    const extractedRefs: string[] = [];

    for (const line of lines) {
      const dateMatch = line.match(mtnDateRegex);
      const timeMatch = line.match(timeRegex);

      if (dateMatch && timeMatch) {
        dateMatches.push({ dateStr: dateMatch[1], timeStr: timeMatch[1] });
      }

      const signedAmountMatch = /([-+])\s*([\d,]+\.\d{2})\b/.exec(line);
      if (signedAmountMatch) {
        signedAmounts.push({
          sign: signedAmountMatch[1],
          amount: parseFloat(signedAmountMatch[2].replace(/,/g, '')),
        });
      }

      const cleanedName = MomoParser.cleanAndExtractName(line, accountHolder);
      if (cleanedName) {
        if (
          cleanedName.startsWith('Packet for Mandate') ||
          cleanedName.includes('transfer with ref') ||
          cleanedName.toLowerCase().includes('nationalid')
        ) {
          extractedRefs.push(cleanedName);
        } else {
          extractedNames.push(cleanedName);
        }
      }
    }

    const count = Math.min(dateMatches.length, signedAmounts.length);
    for (let i = 0; i < count; i++) {
      const dateMatch = dateMatches[i];
      const signedAmt = signedAmounts[i];
      
      const dateObj = MomoParser.parseDateStringWithTime(dateMatch.dateStr, dateMatch.timeStr);
      const merchant = extractedNames[i] || 'Unknown Merchant';
      const reference = extractedRefs[i] || undefined;

      transactions.push({
        amount: signedAmt.amount,
        category: resolveCategory(merchant, {}),
        merchant,
        date: dateObj.toISOString(),
        transactionType: signedAmt.sign === '+' ? 'credit' : 'debit',
        channel,
        confidence: 90,
        reference,
      });
    }

    return transactions;
  }

  /**
   * Cleans a line and extracts an account name if it represents one
   */
  private static cleanAndExtractName(line: string, accountHolder: string): string | null {
    let cleaned = line.trim();
    if (!cleaned) return null;

    const lower = cleaned.toLowerCase();
    if (
      lower.includes('details') ||
      lower.includes('holder') ||
      lower.includes('wallet') ||
      lower.includes('profile') ||
      lower.includes('kyc') ||
      lower.includes('subscriber') ||
      lower.includes('available') ||
      lower.includes('disclaimer') ||
      lower.includes('duration') ||
      lower.includes('page') ||
      lower.includes('fees') ||
      lower.includes('tax') ||
      lower.includes('balance') ||
      lower.includes('mtn') ||
      lower.includes('date') ||
      lower.includes('time') ||
      lower.includes('payment type') ||
      lower.includes('transaction')
    ) {
      return null;
    }

    // Remove dates
    cleaned = cleaned.replace(/\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/gi, '');
    cleaned = cleaned.replace(/\b\d{2}[-/]\d{2}[-/]\d{4}\b/g, '');
    cleaned = cleaned.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '');
    cleaned = cleaned.replace(/\b\d{2}:\d{2}(?::\d{2})?\b/g, '');

    // Remove transaction IDs
    cleaned = cleaned.replace(/\b8\d{10,11}\b/g, '');

    // Remove GHS, currency signs, and numbers
    cleaned = cleaned.replace(/\b(?:GHS|₵)\b/gi, '');
    cleaned = cleaned.replace(/[-+]\s*[\d,]+\.\d{2}\b/g, '');
    cleaned = cleaned.replace(/\b[\d,]+\.\d{2}\b/g, '');
    cleaned = cleaned.replace(/\b0\.00\b/g, '');

    // Remove phone numbers completely
    cleaned = cleaned.replace(/\+?\d[\d\s]{7,15}\d/g, '');
    cleaned = cleaned.replace(/\+?\d{3}\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}\s*\d/g, '');
    cleaned = cleaned.replace(/\+?\d{10,15}/g, '');

    // Clean up keywords
    cleaned = cleaned.replace(/\b(?:DEBIT|CREDIT|CASH OUT|AIRTIME|MOMO USER|OTHER NETWORKS|OTHER TRANSACTIONS|GHANAPAY PUSH)\b/gi, '');

    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '').trim();

    if (cleaned.length > 2 && /^[A-Za-z0-9\s&_.'-]+$/.test(cleaned)) {
      if (accountHolder && cleaned.toLowerCase() === accountHolder.toLowerCase()) {
        return null;
      }
      return cleaned;
    }

    return null;
  }

  /**
   * Helper to parse dates like "28 May 2026" with "14:18"
   */
  private static parseDateStringWithTime(dateStr: string, timeStr: string): Date {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    const mtnDateMatch = /(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/.exec(dateStr);
    if (mtnDateMatch) {
      const day = parseInt(mtnDateMatch[1]);
      const monthStr = mtnDateMatch[2].toLowerCase().slice(0, 3);
      const month = months[monthStr] !== undefined ? months[monthStr] : 0;
      const year = parseInt(mtnDateMatch[3]);

      const timeParts = timeStr.split(':');
      const hours = parseInt(timeParts[0] || '0');
      const minutes = parseInt(timeParts[1] || '0');
      const seconds = parseInt(timeParts[2] || '0');

      return new Date(year, month, day, hours, minutes, seconds);
    }

    const standardDate = MomoParser.parseDateString(dateStr);
    const timeParts = timeStr.split(':');
    standardDate.setHours(parseInt(timeParts[0] || '0'));
    standardDate.setMinutes(parseInt(timeParts[1] || '0'));
    standardDate.setSeconds(parseInt(timeParts[2] || '0'));
    return standardDate;
  }

  /**
   * Helper to parse dates in different local formats (DD/MM/YYYY, DD-MM-YYYY)
   */
  private static parseDateString(dateStr: string): Date {
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return new Date();

    if (parts[0].length === 4) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      return new Date(year, month, day);
    }

    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
  }
}
