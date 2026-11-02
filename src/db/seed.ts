import { and, eq } from 'drizzle-orm';
import { env, isProduction } from '../config/env.js';
import { emailSchema } from '../domain/common.schemas.js';
import { hashPassword } from '../lib/password.js';
import * as budgetsRepository from '../modules/budgets/budgets.repository.js';
import * as categoriesRepository from '../modules/categories/categories.repository.js';
import { currentMonthIST, todayIST } from '../utils/dates.js';
import { closeDb, db } from './index.js';
import { householdMembers, households, transactions, users } from './schema/index.js';

// Safe to run more than once: each step skips what already exists. With no SEED_* settings it creates the
// public demo account, which is only allowed on a local database. SEED_EMAIL + SEED_PASSWORD (and optionally
// SEED_NAME, SEED_HOUSEHOLD) create your own account instead, e.g. a test user on the live database.
const custom = Boolean(process.env.SEED_EMAIL || process.env.SEED_PASSWORD);
const DEMO_USER = custom
  ? {
      name: process.env.SEED_NAME?.trim() || 'Test Head',
      email: emailSchema.parse(process.env.SEED_EMAIL ?? ''),
      password: process.env.SEED_PASSWORD ?? '',
    }
  : { name: 'Demo Head', email: 'demo@homewise.app', password: 'password123' };
const DEMO_HOUSEHOLD = { name: process.env.SEED_HOUSEHOLD?.trim() || (custom ? 'Test Family' : 'Demo Family'), type: 'FAMILY' as const };

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

// Never on the server itself; run it from your own machine with DATABASE_URL pointed at the database.
if (isProduction) {
  console.error('Refusing to seed with NODE_ENV=production');
  process.exit(1);
}
const localDb = ['localhost', '127.0.0.1', '::1'].includes(new URL(env.DATABASE_URL).hostname.replace(/^\[|\]$/g, ''));
if (!custom && !localDb) {
  console.error('The public demo account is for a local database only. Set SEED_EMAIL and SEED_PASSWORD to seed this one.');
  process.exit(1);
}
if (custom && DEMO_USER.password.length < 8) {
  console.error('SEED_PASSWORD must be at least 8 characters');
  process.exit(1);
}

let [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_USER.email)).limit(1);
if (!user) {
  const passwordHash = await hashPassword(DEMO_USER.password);
  [user] = await db
    .insert(users)
    .values({ name: DEMO_USER.name, email: DEMO_USER.email, passwordHash })
    .returning({ id: users.id });
  console.log(`Created user: ${DEMO_USER.email}${custom ? '' : ` / ${DEMO_USER.password}`}`);
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
  console.log(`Created household "${DEMO_HOUSEHOLD.name}" with ${DEMO_USER.email} as HEAD`);
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
