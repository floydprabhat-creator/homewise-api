import * as billsService from '../modules/bills/bills.service.js';

export function generateOccurrencesJob(today: string) {
  return billsService.generateUpcoming(today);
}
