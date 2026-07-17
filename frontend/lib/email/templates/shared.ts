export function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

export function emailShell(preview: string, content: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(preview)}</title></head><body style="margin:0;background:#f5f3ed;color:#171717;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f3ed"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #e4e0d7"><tr><td style="padding:28px 24px;border-top:5px solid #171717"><div style="font-size:21px;font-weight:800;letter-spacing:.02em">Auctus Heritage</div>${content}<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e4e0d7;color:#666;font-size:12px;line-height:1.6">A brand operated by Auctus Lab LLC<br>New York, USA<br><a href="mailto:hello@auctusheritage.com" style="color:#2c6f6d">hello@auctusheritage.com</a> · <a href="https://auctusheritage.com" style="color:#2c6f6d">auctusheritage.com</a></div></td></tr></table></td></tr></table></body></html>`;
}

export function row(label: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  return `<tr><td style="padding:7px 12px 7px 0;color:#777;font-size:12px;vertical-align:top;width:145px">${escapeHtml(label)}</td><td style="padding:7px 0;font-size:14px;line-height:1.5">${escapeHtml(value)}</td></tr>`;
}
