import * as budgetsService from '../modules/budgets/budgets.service.js';
import { currentMonthIST } from '../utils/dates.js';

export function carryOverBudgetsJob() {
  return budgetsService.carryOver(currentMonthIST());
}
