import type { Email } from '../index.js';
import { escape, layout } from './layout.js';

type InviteEmailInput = { to: string; name: string | null; inviterName: string; familyName: string; link: string; expiresOn: string };

export function inviteEmail(input: InviteEmailInput): Email {
  const { to, inviterName, familyName, link, expiresOn } = input;
  const firstName = input.name?.split(' ')[0];
  return {
    to,
    subject: `${inviterName} invited you to ${familyName} on HomeWise`,
    text: `${firstName ? `Hi ${firstName},\n\n` : ''}${inviterName} invited you to join ${familyName} on HomeWise, to share the family budget and bills.\n\nJoin here: ${link}\n\nThe link works until ${expiresOn}.`,
    html: layout(
      `${firstName ? `<p>Hi ${escape(firstName)},</p>` : ''}<p><b>${escape(inviterName)}</b> invited you to join <b>${escape(familyName)}</b> on HomeWise, to share the family budget and bills.</p>
<p style="color:#676C72;font-size:13px">The link works until ${escape(expiresOn)}. If you weren't expecting this, you can ignore it.</p>`,
      { label: `Join ${familyName}`, href: link },
    ),
  };
}
