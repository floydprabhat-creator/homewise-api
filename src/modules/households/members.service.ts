import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../utils/app-error.js';
import type { AuthContext } from '../../utils/auth.js';
import * as billsRepository from '../bills/bills.repository.js';
import * as occurrencesRepository from '../bills/occurrences.repository.js';
import * as householdsRepository from './households.repository.js';

/**
 * The member loses access on their next request (requireAuth reads membership every time). Their
 * spending stays in history as "former member"; their unpaid bills fall back to the head.
 */
export async function remove(auth: AuthContext, userId: string) {
  if (userId === auth.userId) throw AppError.conflict("The head can't be removed from the family");
  const member = await householdsRepository.findActiveMember(auth.householdId, userId);
  if (!member) throw AppError.notFound('Member not found');
  if (member.role === 'HEAD') throw AppError.conflict("The head can't be removed from the family");

  await withTransaction(async (tx) => {
    await householdsRepository.removeMember(auth.householdId, userId, tx);
    await occurrencesRepository.clearAssigneeForUser(auth.householdId, userId, tx);
    await billsRepository.clearDefaultAssigneeForUser(auth.householdId, userId, tx);
  });
}
