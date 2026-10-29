import { and, eq } from 'drizzle-orm';
import { isProduction } from '../config/env.js';
import { hashPassword } from '../lib/password.js';
import * as budgetsRepository from '../modules/budgets/budgets.repository.js';
import * as categoriesRepository from '../modules/categories/categories.repository.js';
import { currentMonthIST, todayIST } from '../utils/dates.js';
import { closeDb, db } from './index.js';
import { householdMembers, households, transactions, users } from './schema/index.js';

// Local development only. Safe to run more than once: each step skips what already exists.
const DEMO_USER = { name: 'Demo Head', email: 'demo@homewise.app', password: 'password123' };
const DEMO_HOUSEHOLD = { name: 'Demo Family', type: 'FAMILY' as const };

// Sample spending for the current month: [category, amount, day of month, note]
const SAMPLE_SPENDING: [string, string, number, string | null][] = [
  ['Groceries', '2315.00', 1, 'BigBasket order'],
  ['Electricity', '2400.00', 2, null],
  ['Transport', '1500.00', 3, 'Petrol'],
  ['Investments', '1200.00', 4, 'SIP, index fund'],
  ['Dining out', '840.00', 5, 'Swiggy dinner'],
  ['Entertainment', '760.00', 6, 'Movie tickets'],
  ['Medical', '1140.00', 7, 'Pharmacy'],
  ['Subscriptions', '649.00', 8, 'Netflix'],
];

if (isProduction) {
  console.error('Refusing to seed demo data in production');
  process.exit(1);
}

let [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_USER.email)).limit(1);
if (!user) {
  const passwordHash = await hashPassword(DEMO_USER.password);
  [user] = await db
    .insert(users)
    .values({ name: DEMO_USER.name, email: DEMO_USER.email, passwordHash })
    .returning({ id: users.id });
  console.log(`Created demo user: ${DEMO_USER.email} / ${DEMO_USER.password}`);
}

let [membership] = await db
  .select({ householdId: householdMembers.householdId })
  .from(householdMembers)
  .where(and(eq(householdMembers.userId, user!.id), eq(householdMembers.status, 'ACTIVE')))
  .limit(1);
if (!membership) {
  const [household] = await db.insert(households).values(DEMO_HOUSEHOLD).returning({ id: households.id });
  await db.insert(householdMembers).values({ householdId: household!.id, userId: user!.id, role: 'HEAD' });
  membership = { householdId: household!.id };
  console.log(`Created household "${DEMO_HOUSEHOLD.name}" with the demo user as HEAD`);
}
const householdId = membership.householdId;

await categoriesRepository.seedDefaults(householdId);
const categoryList = await categoriesRepository.list(householdId, { includeArchived: true });
const categoryId = (name: string) => categoryList.find((c) => c.name === name)!.id;

const month = currentMonthIST();
if (!(await budgetsRepository.findByMonth(householdId, month))) {
  await db.transaction((tx) =>
    budgetsRepository.upsert(
      householdId,
      month,
      {
        totalAmount: '60000.00',
        allocations: { ESSENTIALS: 50, LIFESTYLE: 35, SAVINGS: 15 },
        targets: [
          { categoryId: categoryId('Investments'), percent: 10 },
          { categoryId: categoryId('Emergency fund'), percent: 5 },
        ],
        updatedBy: user!.id,
      },
      tx,
    ),
  );
  console.log(`Created the ${month} budget: ₹60,000 split 50 / 35 / 15`);
}

const [existing] = await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.householdId, householdId)).limit(1);
if (!existing) {
  const today = Number(todayIST().slice(8, 10));
  await db.insert(transactions).values(
    SAMPLE_SPENDING.map(([category, amount, day, note]) => ({
      householdId,
      recordedBy: user!.id,
      categoryId: categoryId(category),
      amount,
      // Never in the future: early in the month, sample days collapse onto today.
      date: `${month}-${String(Math.min(day, today)).padStart(2, '0')}`,
      note,
    })),
  );
  console.log(`Added ${SAMPLE_SPENDING.length} sample spending entries for ${month}`);
}

console.log('Seed complete');
await closeDb();
