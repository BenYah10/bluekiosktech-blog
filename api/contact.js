// /api/contact.js — Vercel Serverless Function (Node 18)
// Bilingue FR/EN + badge coloré selon "type" (demo | pilot | support)

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- helpers ---
function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') {
    try { return JSON.stringify(req.body); } catch (_) {}
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}
function parseBody(raw, contentType = '') {
  contentType = String(contentType || '').toLowerCase();
  if (contentType.includes('application/json')) {
    try { return JSON.parse(raw || '{}'); } catch { return {}; }
  }
  const params = new URLSearchParams(raw || '');
  const obj = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  return obj;
}
function detectLang(req, data) {
  const formLang = (data.lang || '').toLowerCase();
  if (formLang === 'en' || formLang === 'fr') return formLang;
  const al = String(req.headers['accept-language'] || '').toLowerCase();
  return al.startsWith('en') ? 'en' : 'fr';
}

// i18n (labels + sujets)
const I18N = {
  fr: {
    subjectPrefix: 'Contact',
    newMessage: '📬 Nouveau message — Bluekiosktech.blog',
    labels: { name: 'Nom', email: 'Email', org: 'Organisation', type: 'Type', subject: 'Sujet', message: 'Message' },
    types: { demo: 'Démo', pilot: 'Site pilote', support: 'Support' }
  },
  en: {
    subjectPrefix: 'Contact',
    newMessage: '📬 New message — Bluekiosktech.blog',
    labels: { name: 'Name', email: 'Email', org: 'Organization', type: 'Type', subject: 'Subject', message: 'Message' },
    types: { demo: 'Demo', pilot: 'Pilot site', support: 'Support' }
  }
};

// style/couleur des badges par type
const TYPE_META = {
  demo:    { color: '#2563eb' }, // bleu
  pilot:   { color: '#16a34a' }, // vert
  support: { color: '#ea580c' }  // orange
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const raw = await readRawBody(req);
    const data = parseBody(raw, req.headers['content-type']);

    // Honeypot anti-spam
    if (data.website) return res.status(204).end();

    const fullname = (data.fullname || '').trim();
    const email    = (data.email || '').trim();
    const org      = (data.org || '').trim();
    const subject  = (data.subject || '').trim() || 'Contact';
    const type     = (data.type || '').trim().toLowerCase(); // demo | pilot | support
    const message  = (data.message || '').trim();

    if (!fullname || !email || !message) {
      return res.status(400).end('Missing required fields');
    }

    const lang = detectLang(req, data);         // 'fr' ou 'en'
    const t = I18N[lang] || I18N.fr;
    const typeLabel = (t.types[type] || type || '—');
    const badge = TYPE_META[type] || { color: '#475569' }; // défaut gris

    const to   = process.env.INTERNAL_NOTIFY || process.env.FROM_EMAIL;
    const from = process.env.FROM_EMAIL;

    // -------- TEXT (fallback) --------
    const text =
`${t.newMessage}

${t.labels.name}: ${fullname}
${t.labels.email}: ${email}
${t.labels.org}: ${org || '—'}
${t.labels.type}: ${typeLabel}
${t.labels.subject}: ${subject}

${t.labels.message}:
${message}

IP: ${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''}
UA: ${req.headers['user-agent'] || ''}`;

    // -------- HTML (avec badge) --------
    const msgHtml = escapeHtml(message).replace(/\n/g, '<br>');
    const badgeStyle = `display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;background:${badge.color};color:#fff;`;
    const html = `<!doctype html>
<html lang="${lang}">
  <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.55;color:#0f172a;background:#fff;margin:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;padding:24px">
      <tr><td>
        <h2 style="margin:0 0 8px">${escapeHtml(t.newMessage)}</h2>
        <div style="${badgeStyle}">${escapeHtml(typeLabel)}</div>

        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr>
            <td style="padding:8px 0;width:160px;color:#475569">${escapeHtml(t.labels.name)}</td>
            <td style="padding:8px 0;font-weight:600">${escapeHtml(fullname)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#475569">${escapeHtml(t.labels.email)}</td>
            <td style="padding:8px 0"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#475569">${escapeHtml(t.labels.org)}</td>
            <td style="padding:8px 0">${escapeHtml(org) || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#475569">${escapeHtml(t.labels.subject)}</td>
            <td style="padding:8px 0">${escapeHtml(subject)}</td>
          </tr>
        </table>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
        <div>
          <div style="color:#475569;margin-bottom:6px">${escapeHtml(t.labels.message)} :</div>
          <div>${msgHtml}</div>
        </div>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
        <div style="color:#94a3b8;font-size:12px">
          IP: ${escapeHtml(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')}<br>
          UA: ${escapeHtml(req.headers['user-agent'] || '')}
        </div>
      </td></tr>
    </table>
  </body>
</html>`;

    await sgMail.send({
      to,
      from,
      replyTo: email,
      subject: `${t.subjectPrefix}: ${subject} — ${fullname}`,
      text,
      html
    });

    // Redirection après POST vers /success.html
    res.statusCode = 303; // See Other
    res.setHeader('Location', '/success.html');
    return res.end();
  } catch (err) {
    console.error('contact.js error:', err?.response?.body || err);
    return res.status(500).end('Email failed');
  }
};
