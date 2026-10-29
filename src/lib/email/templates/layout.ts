import { env } from '../../../config/env.js';

export const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Absolute link into the web app. */
export const appLink = (path: string) => `${env.APP_URL}${path.startsWith('/') ? path : `/${path}`}`;

/** Shared wrapper: plain HTML with inline styles, no template engine. */
export function layout(body: string, action?: { label: string; href: string }) {
  const button = action
    ? `<p style="margin:24px 0"><a href="${escape(action.href)}" style="display:inline-block;background:#5F259F;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">${escape(action.label)}</a></p>`
    : '';
  return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#212121;max-width:520px">
${body}${button}
<p style="color:#676C72;font-size:12px;margin-top:32px">You get this because you're in a household on HomeWise.</p>
</div>`;
}
