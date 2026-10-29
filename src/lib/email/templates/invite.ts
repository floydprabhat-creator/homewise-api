import type { Email } from '../index.js';
import { escape, layout } from './layout.js';

export function inviteEmail(input: { to: string; inviterName: string; familyName: string; link: string; expiresOn: string }): Email {
  const { to, inviterName, familyName, link, expiresOn } = input;
  return {
    to,
    subject: `${inviterName} invited you to ${familyName} on HomeWise`,
    text: `${inviterName} invited you to join ${familyName} on HomeWise, to share the family budget and bills.\n\nJoin here: ${link}\n\nThe link works until ${expiresOn}.`,
    html: layout(
      `<p><b>${escape(inviterName)}</b> invited you to join <b>${escape(familyName)}</b> on HomeWise, to share the family budget and bills.</p>
<p style="color:#676C72;font-size:13px">The link works until ${escape(expiresOn)}. If you weren't expecting this, you can ignore it.</p>`,
      { label: `Join ${familyName}`, href: link },
    ),
  };
}
