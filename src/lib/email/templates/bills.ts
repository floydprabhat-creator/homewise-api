import type { Email } from '../index.js';
import { appLink, escape, layout } from './layout.js';

type BillNotice = { title: string; body: string; link: string | null };

/**
 * One email for all of a user's pending bill notifications (reminders, escalations, overdue).
 * Each notice's body already carries the amount, due date and who is responsible.
 */
export function billsEmail(to: string, notices: BillNotice[]): Email {
  const subject = notices.length === 1 ? notices[0]!.title : `${notices.length} bills need attention`;
  const items = notices
    .map((n) => `<li style="margin-bottom:12px"><b>${escape(n.title)}</b><br><span style="color:#4F545A">${escape(n.body)}</span></li>`)
    .join('');
  return {
    to,
    subject,
    text: `${notices.map((n) => `• ${n.title}\n  ${n.body}`).join('\n\n')}\n\nOpen your bills: ${appLink('/bills')}`,
    html: layout(`<ul style="padding-left:18px;margin:0">${items}</ul>`, { label: 'Open bills', href: appLink('/bills') }),
  };
}
