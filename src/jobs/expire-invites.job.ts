import * as invitesService from '../modules/invites/invites.service.js';

export function expireInvitesJob() {
  return invitesService.expireOld(new Date());
}
