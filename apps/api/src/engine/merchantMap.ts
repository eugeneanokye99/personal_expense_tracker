// Global Ghana merchant to category mapping
// User-specific overrides from merchant_category_overrides table take precedence
export const GLOBAL_MERCHANT_MAP: Record<string, string> = {
  // Supermarkets & Food Retail
  Shoprite: 'Food', Maxmart: 'Food', Koala: 'Food', Palace: 'Shopping',
  Melcom: 'Shopping', Game: 'Shopping',

  // Fast Food & Restaurants
  KFC: 'Food', Papaye: 'Food', 'Chicken Republic': 'Food', 'Pizza Inn': 'Food',
  'Burger King': 'Food', Galitos: 'Food', 'Chicken Inn': 'Food',
  'Mr Biggs': 'Food', 'Marwako': 'Food', 'Mama Kate': 'Food',

  // Ride-share & Transport
  Bolt: 'Transport', Uber: 'Transport', Yango: 'Transport', InDrive: 'Transport',
  STC: 'Transport', VIP: 'Transport', VVIP: 'Transport',

  // Fuel Stations
  Total: 'Transport', TotalEnergies: 'Transport', Shell: 'Transport',
  GOIL: 'Transport', Puma: 'Transport', Zen: 'Transport', Frisk: 'Transport',

  // Utilities
  ECG: 'Utilities', GWCL: 'Utilities', 'Ghana Water': 'Utilities',
  Vodafone: 'Utilities', MTN: 'Utilities', AirtelTigo: 'Utilities',
  'Electricity Company': 'Utilities',

  // Healthcare
  'Lister Hospital': 'Health', 'Trust Hospital': 'Health',
  'Nyaho Clinic': 'Health', 'Poly Clinic': 'Health',
  '37 Military Hospital': 'Health', Pharmacy: 'Health', 'Ernest Chemist': 'Health',

  // Malls
  'Accra Mall': 'Shopping', 'Marina Mall': 'Shopping',
  'West Hills Mall': 'Shopping', 'Kumasi City Mall': 'Shopping',
  'Achimota Mall': 'Shopping', 'Junction Mall': 'Shopping',

  // Entertainment
  Silverbird: 'Entertainment', 'IMAX Ghana': 'Entertainment',
  'Elbow Room': 'Entertainment', 'Carbon': 'Entertainment',

  // Banks / MoMo (likely transfers, not purchases)
  'MTN MoMo': 'Transfers', GCB: 'Transfers', Ecobank: 'Transfers',
  Fidelity: 'Transfers', Absa: 'Transfers', Stanbic: 'Transfers',
};

export function resolveCategory(merchant: string, userOverrides: Record<string, string>): string {
  if (userOverrides[merchant]) return userOverrides[merchant];
  const globalMatch = Object.keys(GLOBAL_MERCHANT_MAP).find(k =>
    merchant.toLowerCase().includes(k.toLowerCase())
  );
  return globalMatch ? GLOBAL_MERCHANT_MAP[globalMatch] : 'Other';
}
