import { siteConfig } from "@/lib/site";

export function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] || character,
  );
}

export function emailShell(preview: string, content: string) {
  const logoUrl = `${siteConfig.domain}${siteConfig.logoPath}`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(preview)}</title></head><body style="margin:0;background:#f5f3ed;color:#171717;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f3ed"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #e4e0d7"><tr><td style="padding:28px 24px;border-top:5px solid #171717"><img src="${logoUrl}" width="260" alt="Auctus Heritage" style="display:block;width:260px;max-width:78%;height:auto;margin:0 0 26px">${content}<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e4e0d7;color:#666;font-size:12px;line-height:1.6">A brand operated by Auctus Lab LLC<br>New York, USA<br><a href="mailto:${siteConfig.contactEmail}" style="color:#2c6f6d">${siteConfig.contactEmail}</a> · <a href="${siteConfig.domain}" style="color:#2c6f6d">auctusheritage.com</a></div></td></tr></table></td></tr></table></body></html>`;
}

export function row(label: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  return `<tr><td style="padding:7px 12px 7px 0;color:#777;font-size:12px;vertical-align:top;width:145px">${escapeHtml(label)}</td><td style="padding:7px 0;font-size:14px;line-height:1.5">${escapeHtml(value)}</td></tr>`;
}
