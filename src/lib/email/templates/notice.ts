import type { Email } from '../index.js';
import { appLink, escape, layout } from './layout.js';

/** Budget warnings, carry-over and any other single notification. */
export function noticeEmail(to: string, notice: { title: string; body: string; link: string | null }): Email {
  const href = appLink(notice.link ?? '/dashboard');
  return {
    to,
    subject: notice.title,
    text: `${notice.title}\n\n${notice.body}\n\nOpen HomeWise: ${href}`,
    html: layout(`<p style="font-size:17px"><b>${escape(notice.title)}</b></p><p>${escape(notice.body)}</p>`, {
      label: 'Open HomeWise',
      href,
    }),
  };
}
