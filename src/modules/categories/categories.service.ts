import type { DbClient } from '../../db/types.js';
import { AppError } from '../../utils/app-error.js';
import type { AuthContext } from '../../utils/auth.js';
import { isUniqueViolation } from '../../utils/db-errors.js';
import * as categoriesRepository from './categories.repository.js';
import type { CreateCategoryInput, ListCategoriesQuery, UpdateCategoryInput } from './categories.schemas.js';

const nameTaken = () => AppError.conflict('A category with this name already exists', { name: 'Already in use' });

export function list(auth: AuthContext, query: ListCategoriesQuery) {
  return categoriesRepository.list(auth.householdId, query);
}

export async function create(auth: AuthContext, input: CreateCategoryInput) {
  if (await categoriesRepository.existsByName(auth.householdId, input.name)) throw nameTaken();
  try {
    return await categoriesRepository.create(auth.householdId, input);
  } catch (err) {
    if (isUniqueViolation(err, 'categories_household_name_idx')) throw nameTaken();
    throw err;
  }
}

export async function update(auth: AuthContext, id: string, input: UpdateCategoryInput) {
  const category = await categoriesRepository.findById(auth.householdId, id);
  if (!category) throw AppError.notFound('Category not found');

  if (category.isSystem && (input.bucket !== undefined || input.archived !== undefined)) {
    throw AppError.conflict('Default categories can be renamed, but not moved or archived');
  }
  if (input.bucket && input.bucket !== category.bucket && (await categoriesRepository.hasTransactions(auth.householdId, id))) {
    throw AppError.conflict("This category already has spending, so its bucket can't change");
  }
  if (input.archived && (await categoriesRepository.hasActiveBills(auth.householdId, id))) {
    throw AppError.conflict('An active bill uses this category. Archive or change the bill first');
  }
  if (input.name && (await categoriesRepository.existsByName(auth.householdId, input.name, id))) throw nameTaken();

  try {
    const updated = await categoriesRepository.update(auth.householdId, id, {
      name: input.name,
      bucket: input.bucket,
      archivedAt: input.archived === undefined ? undefined : input.archived ? new Date() : null,
    });
    if (!updated) throw AppError.notFound('Category not found');
    return updated;
  } catch (err) {
    if (isUniqueViolation(err, 'categories_household_name_idx')) throw nameTaken();
    throw err;
  }
}

/** Called when a household is created, inside its transaction. */
export function seedDefaults(householdId: string, tx: DbClient) {
  return categoriesRepository.seedDefaults(householdId, tx);
}
