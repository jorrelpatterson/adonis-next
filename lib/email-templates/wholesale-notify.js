// lib/email-templates/wholesale-notify.js
// Plain admin notification — simple HTML, no fancy branding needed.
// (Public-facing emails get the cream-luxe template; admin only needs facts.)

export function wholesaleNotifyHtml(application) {
  const rows = [
    ['Business', application.business_name],
    ['Contact', application.contact_name],
    ['Phone', application.phone],
    ['Email', application.email],
    ['Country', application.country],
    ['State / Province', application.state],
    ['Expected monthly volume', application.expected_volume],
    ['Submitted at', new Date().toISOString()],
  ];

  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#7A7D88;font-size:12px;letter-spacing:1px;text-transform:uppercase;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 0;color:#1A1C22;font-size:14px">${escapeHtml(v || '—')}</td></tr>`
    )
    .join('');

  return `<html><body style="margin:0;padding:24px;background:#F4F2EE;font-family:Arial,Helvetica,sans-serif;color:#1A1C22">
  <div style="max-width:560px;margin:0 auto">
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">New wholesale inquiry</div>
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#1A1C22">${escapeHtml(application.business_name)}</h1>
    <table style="border-collapse:collapse;width:100%">${rowsHtml}</table>
    <p style="margin-top:32px;font-size:12px;color:#7A7D88">Review in the admin: <a href="https://advncelabs.com/admin/distributors" style="color:#00A0A8">/admin/distributors</a></p>
  </div>
</body></html>`;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
