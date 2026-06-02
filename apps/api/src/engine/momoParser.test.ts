import { describe, it, expect } from 'vitest';
import { MomoParser } from './momoParser';

describe('MomoParser Engine Tests', () => {
  it('should parse legacy MTN MoMo statement text successfully', () => {
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

  it('should parse MTN MoMo horizontal statement lines with references successfully', () => {
    const horizontalText = `
Date & Time Payment Type To/From Account Name Amount Transaction ID Fees Tax Balance Reference
28 May 2026 14:18 AIRTIME +233 59 90 12 81 7 233599012817@MTNONLINEAIRTIMEVENDOR-8.00 82187345928 GHS 0.00 GHS 0.00 GHS 73.06
28 May 2026 12:25 MOMO USER +233 24 20 41 02 7 EMELIA BOATEY-24.50 82180625799 GHS 0.00 GHS 0.00 GHS 81.06
28 May 2026 05:47 DEBIT Yellosave Autodebit-5.00 82158821583 GHS 0.00 GHS 0.00 GHS 105.56 Packet for Mandate 1762412521385 product YELLO.D
27 May 2026 23:05 MOMO USER +233 55 33 37 56 7 ERIC ADJEI YEBOAH-70.00 82155250503 GHS 0.52 GHS 0.00 GHS 110.56 1
27 May 2026 18:16 CASH OUT +233 59 85 24 72 6 RACHAEL SARHENE-50.00 82138516920 GHS 0.50 GHS 0.00 GHS 371.95 NationalId--
27 May 2026 15:30 MOMO USER INTEROPERABILITY PULL OVA +420.00 82127900117 GHS 0.00 GHS 0.00 GHS 422.45 EUGENE DOKYE ANOKYE ,03xxxxxx12,FTC for 233599012817 from PBL Prudential Bank Limited
    `;

    const txs = MomoParser.parseText(horizontalText);

    expect(txs.length).toBe(6);

    // EMELIA BOATEY
    const emelia = txs.find(t => t.merchant === 'EMELIA BOATEY');
    expect(emelia).toBeDefined();
    expect(emelia!.amount).toBe(24.50);
    expect(emelia!.transactionType).toBe('debit');

    // RACHAEL SARHENE
    const rachael = txs.find(t => t.merchant === 'RACHAEL SARHENE');
    expect(rachael).toBeDefined();
    expect(rachael!.amount).toBe(50.00);
    expect(rachael!.reference).toBe('NationalId--');

    // INTEROPERABILITY PULL OVA (credit)
    const credit = txs.find(t => t.transactionType === 'credit');
    expect(credit).toBeDefined();
    expect(credit!.amount).toBe(420.00);
    expect(credit!.reference).toContain('FTC for 233599012817 from PBL Prudential Bank Limited');
  });

  it('should parse MTN MoMo columnar vertically stacked statement sections successfully', () => {
    const columnarText = `
Account details
Account holder: EUGENE DOKYE ANOKYE
Wallet number: +233 599012817
Statement Details
Transaction details
31 May 2026 05:50
30 May 2026 18:56
DEBIT
MOMO USER
Yellosave Autodebit
+233 54 49
11 90 2
GEORGE OPOKU
AFRIYIE-5.00
82358964775
GHS
0.00
GHS
0.00
GHS
771.15-50.00
    `;

    const txs = MomoParser.parseText(columnarText);

    expect(txs.length).toBe(2);

    // Yellosave Autodebit
    expect(txs[0].merchant).toBe('Yellosave Autodebit');
    expect(txs[0].amount).toBe(5.00);

    // GEORGE OPOKU AFRIYIE
    expect(txs[1].merchant).toBe('GEORGE OPOKU AFRIYIE');
    expect(txs[1].amount).toBe(50.00);
  });
});
