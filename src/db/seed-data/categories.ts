import type { Bucket } from '../../domain/constants.js';

/** The 20 categories every new household starts with (F4). */
export const DEFAULT_CATEGORIES: Record<Bucket, string[]> = {
  ESSENTIALS: [
    'Groceries',
    'Electricity',
    'Water',
    'Gas',
    'Rent / EMI',
    'School fees',
    'Mobile & internet',
    'Medical',
    'Household help',
    'Transport',
  ],
  LIFESTYLE: ['Travel', 'Shopping', 'Dining out', 'Entertainment', 'Subscriptions', 'Personal care', 'Gifts'],
  SAVINGS: ['Investments', 'Emergency fund', 'Fixed deposits'],
};
