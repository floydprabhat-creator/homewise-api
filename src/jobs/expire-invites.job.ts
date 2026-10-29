import * as invitesService from '../modules/invites/invites.service.js';

/** Invites past their expiry become EXPIRED. Uses the clock, not `today`: expiry is a timestamp. */
export function expireInvitesJob(_today: string) {
  return invitesService.expireOld(new Date());
}
