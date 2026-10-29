import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../utils/app-error.js';
import type { AuthContext } from '../../utils/auth.js';
import { currentMonthIST } from '../../utils/dates.js';
import { isUniqueViolation } from '../../utils/db-errors.js';
import * as authService from '../auth/auth.service.js';
import * as budgetsService from '../budgets/budgets.service.js';
import * as thresholdsService from '../budgets/thresholds.service.js';
import * as categoriesRepository from '../categories/categories.repository.js';
import * as categoriesService from '../categories/categories.service.js';
import { avatarUrl } from '../users/avatar-url.js';
import * as usersRepository from '../users/users.repository.js';
import * as householdsRepository from './households.repository.js';
import type { OnboardingInput, UpdateHouseholdInput } from './households.schemas.js';

const alreadyInHousehold = () =>
  new AppError(409, 'ALREADY_IN_HOUSEHOLD', 'You already belong to a household');

export async function get(auth: AuthContext) {
  const [household, members] = await Promise.all([
    householdsRepository.findById(auth.householdId),
    householdsRepository.listActiveMembers(auth.householdId),
  ]);
  if (!household) throw AppError.notFound('Household not found');
  return {
    household,
    members: members.map(({ avatarKey, ...m }) => ({ ...m, avatarUrl: avatarUrl(m.userId, avatarKey) })),
  };
}

/**
 * Creates the household with the user as HEAD, seeds the default categories, and saves the
 * current month's budget, all in one transaction.
 */
export async function onboarding(userId: string, input: OnboardingInput) {
  if (await householdsRepository.findActiveMembership(userId)) throw alreadyInHousehold();

  const user = await usersRepository.findById(userId);
  if (!user) throw AppError.unauthorized();

  const month = currentMonthIST();
  const name =
    input.mode === 'FAMILY' ? input.familyName! : `${user.name.split(' ')[0]}'s household`;

  let householdId: string;
  try {
    householdId = await withTransaction(async (tx) => {
      const household = await householdsRepository.create({ name, type: input.mode }, tx);
      await householdsRepository.addMember({ householdId: household.id, userId, role: 'HEAD' }, tx);
      await categoriesService.seedDefaults(household.id, tx);

      const savings = await categoriesRepository.findByNames(household.id, ['Investments', 'Emergency fund'], tx);
      const idOf = (n: string) => savings.find((c) => c.name === n)!.id;
      const targets = [
        { categoryId: idOf('Investments'), percent: input.targets.investments },
        { categoryId: idOf('Emergency fund'), percent: input.targets.emergencyFund },
      ].filter((t) => t.percent > 0);

      const auth: AuthContext = { userId, householdId: household.id, role: 'HEAD' };
      await budgetsService.upsert(
        auth,
        month,
        { totalAmount: input.totalAmount, allocations: input.allocations, targets },
        tx,
      );
      return household.id;
    });
  } catch (err) {
    // A second onboarding request racing the first: the one-active-membership index rejects it.
    if (isUniqueViolation(err, 'household_members_active_user_idx')) throw alreadyInHousehold();
    throw err;
  }

  await thresholdsService.checkAfterChange(householdId, month);
  return authService.getSessionContext(userId);
}

/** Rename, or turn a personal household into a family. All data stays where it is. */
export async function update(auth: AuthContext, input: UpdateHouseholdInput) {
  const household = await householdsRepository.findById(auth.householdId);
  if (!household) throw AppError.notFound('Household not found');
  const updated = await householdsRepository.update(auth.householdId, { name: input.name, type: input.type });
  if (!updated) throw AppError.notFound('Household not found');
  return updated;
}
