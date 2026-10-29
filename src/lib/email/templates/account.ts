import type { Email } from '../index.js';
import { escape, layout } from './layout.js';

export function passwordCodeEmail(to: string, name: string, code: string, minutes: number): Email {
  return {
    to,
    subject: `${code} is your HomeWise code`,
    text: `Hi ${name},\n\nUse ${code} to change your HomeWise password. It works for ${minutes} minutes.\n\nIf you didn't ask for this, you can ignore it; your password stays the same.`,
    html: layout(
      `<p>Hi ${escape(name)},</p><p>Use this code to change your HomeWise password:</p>
<p style="font-size:28px;font-weight:800;letter-spacing:6px;margin:16px 0">${escape(code)}</p>
<p style="color:#676C72;font-size:13px">It works for ${minutes} minutes. If you didn't ask for this, you can ignore it; your password stays the same.</p>`,
    ),
  };
}

export function passwordChangedEmail(to: string, name: string): Email {
  return {
    to,
    subject: 'Your HomeWise password was changed',
    text: `Hi ${name},\n\nYour HomeWise password was just changed, and other devices were signed out.\n\nIf this wasn't you, reset your password right away and tell the head of your household.`,
    html: layout(
      `<p>Hi ${escape(name)},</p><p>Your HomeWise password was just changed, and other devices were signed out.</p>
<p style="color:#676C72;font-size:13px">If this wasn't you, reset your password right away and tell the head of your household.</p>`,
    ),
  };
}
