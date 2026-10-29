export const RECOMMENDED_SPLIT = {
  allocations: { ESSENTIALS: 50, LIFESTYLE: 35, SAVINGS: 15 },
  targets: [
    { categoryName: 'Investments', percent: 10 },
    { categoryName: 'Emergency fund', percent: 5 },
  ],
} as const;
