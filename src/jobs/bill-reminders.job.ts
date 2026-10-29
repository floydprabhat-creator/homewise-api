import * as remindersService from '../modules/notifications/reminders.service.js';

export function billRemindersJob(today: string) {
  return remindersService.run(today);
}
