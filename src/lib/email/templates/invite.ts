import type { Email } from '../index.js';

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function inviteEmail(input: { to: string; inviterName: string; familyName: string; link: string; expiresOn: string }): Email {
  const { to, inviterName, familyName, link, expiresOn } = input;
  return {
    to,
    subject: `${inviterName} invited you to ${familyName} on HomeWise`,
    text: `${inviterName} invited you to join ${familyName} on HomeWise, to share the family budget and bills.\n\nJoin here: ${link}\n\nThe link works until ${expiresOn}.`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#212121;max-width:480px">
  <p><b>${escape(inviterName)}</b> invited you to join <b>${escape(familyName)}</b> on HomeWise, to share the family budget and bills.</p>
  <p><a href="${escape(link)}" style="display:inline-block;background:#5F259F;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Join ${escape(familyName)}</a></p>
  <p style="color:#676C72;font-size:13px">The link works until ${escape(expiresOn)}. If you weren't expecting this, you can ignore it.</p>
</div>`,
  };
}
