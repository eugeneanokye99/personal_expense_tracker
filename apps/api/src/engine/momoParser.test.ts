import { describe, it, expect } from 'vitest';
import { MomoParser } from './momoParser';

describe('MomoParser Engine Tests', () => {
  it('should parse MTN MoMo statement text successfully', () => {
    const mockMtnStatement = `
      MTN Mobile Money Transaction Statement
      Date: 2026-05-29
      
      29/05/2026 14:20:15 Sent to Shoprite GHS 75.50 Reference: Groceries
      28/05/2026 10:12:00 Payment to Bolt GHS 25.00 Reference: Ride
      27/05/2026 18:30:00 Received GHS 150.00 from Kofi Mensah Reference: Gift
    `;

    const txs = MomoParser.parseText(mockMtnStatement);

    expect(txs.length).toBe(3);
    
    // Check first transaction (Debit)
    expect(txs[0].amount).toBe(75.50);
    expect(txs[0].merchant).toBe('Shoprite');
    expect(txs[0].category).toBe('Food');
    expect(txs[0].transactionType).toBe('debit');
    expect(txs[0].channel).toBe('MTN MoMo');
    expect(txs[0].confidence).toBeGreaterThanOrEqual(90);

    // Check second transaction (Debit)
    expect(txs[1].amount).toBe(25.00);
    expect(txs[1].merchant).toBe('Bolt');
    expect(txs[1].category).toBe('Transport');
    expect(txs[1].transactionType).toBe('debit');

    // Check third transaction (Credit)
    expect(txs[2].amount).toBe(150.00);
    expect(txs[2].merchant).toBe('Kofi Mensah');
    expect(txs[2].transactionType).toBe('credit');
  });

  it('should parse Telecel Cash statement text successfully', () => {
    const mockTelecelStatement = `
      Telecel Cash Customer Statement
      Date: 29-05-2026
      
      29/05/2026 09:15:30 Transfer to Vodafone GHS 50.00 Success
      28/05/2026 11:30:00 Cash In GHS 200.00 Success
    `;

    const txs = MomoParser.parseText(mockTelecelStatement);

    expect(txs.length).toBe(2);
    expect(txs[0].channel).toBe('Telecel Cash');
    expect(txs[0].amount).toBe(50.00);
    expect(txs[0].merchant).toBe('Vodafone');
    expect(txs[0].category).toBe('Utilities');
    expect(txs[0].transactionType).toBe('debit');

    expect(txs[1].amount).toBe(200.00);
    expect(txs[1].transactionType).toBe('credit');
  });
});
