// Sends email from the arcade's Microsoft 365 (Outlook) mailbox through Microsoft Graph.
// Needs these environment variables (set them in Vercel, never in this repo):
//   MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET  - an Entra app registration with the
//       application permission Mail.Send (admin consent granted)
//   MAIL_FROM                                     - the mailbox to send from, e.g. arcade@yourdomain.com
export const mailReady = () => !!(process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET && process.env.MAIL_FROM);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function sendMail({ to, subject, html, copyOwner = false }) {
  if (!mailReady() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to || '')) return false;
  try {
    const t = await fetch(`https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({ client_id: process.env.MS_CLIENT_ID, client_secret: process.env.MS_CLIENT_SECRET, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
    }).then(r => r.json());
    if (!t.access_token) throw new Error('mail sign-in failed');
    const from = process.env.MAIL_FROM;
    const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
      method: 'POST', headers: { Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ saveToSentItems: true, message: { subject, body: { contentType: 'HTML', content: html },
        toRecipients: [{ emailAddress: { address: to } }], ...(copyOwner ? { bccRecipients: [{ emailAddress: { address: from } }] } : {}) } }),
    });
    if (!r.ok) throw new Error('mail send failed ' + r.status);
    return true;
  } catch (e) { console.error(e.message); return false; }
}
const wrap = inner => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111"><h2 style="color:#e01226">BIG BANG ARCADE</h2>${inner}<p style="color:#777;font-size:12px">T1 Entertainment · bigbangarcade.com</p></div>`;

// Email for a redeemed real prize. Tickets carry their link; merch asks for shipping details by reply.
export const prizeMail = (to, name, prize, code) => sendMail({ to, copyOwner: true, subject: `Your Big Bang Arcade prize: ${prize.name}`,
  html: wrap(`<p>${esc(name)}, you redeemed <b>${esc(prize.name)}</b>.</p><p>Claim code: <b style="font-size:18px">${esc(code)}</b></p>` +
    (prize.kind === 'ticket' && prize.link ? `<p><a href="${esc(prize.link)}" style="background:#ffc93a;color:#111;padding:10px 16px;text-decoration:none;font-weight:bold;border-radius:6px">GET YOUR TICKETS</a></p><p>That link opens the ticket page with your free code applied. Finish the order there and the tickets are sent to you.</p>`
      : `<p>Reply to this email with your size (if it applies) and shipping address, and include your claim code.</p>`)) });
export const receiptMail = (to, name, tokens, dollars, ref) => sendMail({ to, copyOwner: true, subject: `Receipt: ${tokens} Big Bang Arcade tokens`,
  html: wrap(`<p>${esc(name)}, thanks for your purchase.</p><p><b>${tokens} tokens</b> for $${dollars} were added to your arcade player.</p><p>Payment reference: ${esc(ref)}</p>`) });
