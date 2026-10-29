import * as budgetsService from '../modules/budgets/budgets.service.js';
import { monthOf } from '../utils/dates.js';

export function carryOverBudgetsJob(today: string) {
  return budgetsService.carryOver(monthOf(today));
}
