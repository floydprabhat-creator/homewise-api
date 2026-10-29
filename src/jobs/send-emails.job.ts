import * as emailsService from '../modules/notifications/emails.service.js';

export function sendEmailsJob(_today: string) {
  return emailsService.sendPending();
}
