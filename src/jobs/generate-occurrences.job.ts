import * as billsService from '../modules/bills/bills.service.js';
import { todayIST } from '../utils/dates.js';

export function generateOccurrencesJob() {
  return billsService.generateUpcoming(todayIST());
}
