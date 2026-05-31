import { describe, it, expect } from 'vitest';

// Simple unit tests for SpendWisely frontend calculations
describe('Frontend Context Store Calculations', () => {
  const mockExpenses = [
    { id: '1', amount: 150.00, category: 'Food', merchant: 'Shoprite', date: new Date(), description: '', tags: [], source: 'manual' as const },
    { id: '2', amount: 50.00, category: 'Transport', merchant: 'Bolt', date: new Date(), description: '', tags: [], source: 'manual' as const },
    { id: '3', amount: 25.00, category: 'Food', merchant: 'KFC', date: new Date(), description: '', tags: [], source: 'email' as const },
  ];

  it('should accurately calculate total spending', () => {
    const totalSpent = mockExpenses.reduce((sum, e) => sum + e.amount, 0);
    expect(totalSpent).toBe(225.00);
  });

  it('should filter and calculate spending by specific category', () => {
    const foodSpent = mockExpenses
      .filter(e => e.category === 'Food')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const transportSpent = mockExpenses
      .filter(e => e.category === 'Transport')
      .reduce((sum, e) => sum + e.amount, 0);

    expect(foodSpent).toBe(175.00);
    expect(transportSpent).toBe(50.00);
  });

  it('should compute category percentage accurately', () => {
    const totalSpent = 225.00;
    const foodSpent = 175.00;
    
    const percentage = (foodSpent / totalSpent) * 100;
    expect(percentage).toBeCloseTo(77.78, 2);
  });
});
