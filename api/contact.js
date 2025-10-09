// /api/contact.js — Vercel Serverless Function (Node 18+)
// Robuste aux vieux noms de champs + variantes FR/EN + logs de debug

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ---------- helpers ----------
function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') {
    try { return JSON.stringify(req.body); } catch {}
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

function parseBody(raw, contentType = '') {
  contentType = String(contentType || '').toLowerCase();
  // JSON
  if (contentType.includes('application/json')) {
    try { return JSON.parse(raw || '{}'); } catch { return {}; }
  }
  // x-www-form-urlencoded (par défaut formulaire HTML)
  if (contentType.includes('application/x-www-form-urlencoded') || !contentType) {
    const params = new URLSearchParams(raw || '');
    const obj = {};
    for (const [k, v] of params.entries()) obj[k] = v;
    return obj;
  }
  // tentative : text/plain (certains outils JS)
  if (contentType.includes('text/plain')) {
    try {
      const obj = {};
      (raw || '').split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) obj[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
      return obj;
    } catch { return {}; }
  }
  // multipart/form-data (non géré sans lib) -> retour vide
  return {};
}

// Normalisation très tolérante
function normalize(o = {}, req) {
  // mappe une clé arbitraire vers une clé canonique
  const toCanon = (key) => {
    const k = String(key || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // accents
      .toLowerCase().replace(/[^a-z0-9]+/g, '');        // tout sauf a-z0-9

    const alias = {
      // fullname
      fullname: 'fullname', nom: 'fullname', nomcomplet: 'fullname',
      name: 'fullname', username: 'fullname', yourname: 'fullname',
      fullnamee: 'fullname', fullnam: 'fullname', fullnamefr: 'fullname',
      // email
      email: 'email', mail: 'email', courriel: 'email', adresseemail: 'email',
      // org
      org: 'org', organisation: 'org', organization: 'org',
      company: 'org', societe: 'org', entreprise: 'org',
      // subject
      subject: 'subject', sujet: 'subject', suject: 'subject',
      // type
      type: 'type', typedemande: 'type', demande: 'type', option: 'type',
      // message
      message: 'message', msg: 'message', contenu: 'message',
      comment: 'message', comments: 'message', body: 'message',
      // lang
      lang: 'lang', language: 'lang',
      // honeypot
      website: 'website', url: 'website'
    };

    if (alias[k]) return alias[k];

    // heuristiques : noms composés "full-name", "full_name"...
    if (k.includes('fullname') || (k.includes('name') && !k.includes('user'))) return 'fullname';
    if (k.includes('mail')) return 'email';
    if (k.includes('org') || k.includes('organis') || k.includes('company')) return 'org';
    if (k.includes('sujet') || k.includes('subject')) return 'subject';
    if (k.includes('type')) return 'type';
    if (k.includes('msg') || k.includes('message') || k.includes('comment')) return 'message';
    if (k.includes('lang')) return 'lang';
    if (k.includes('web') || k.includes('site')) return 'website';
    return key;
  };

  const out = {};
  for (const [key, val] of Object.entries(o)) {
    const canon = toCanon(key);
    if (['fullname','email','org','subject','type','message','lang','website'].includes(canon)) {
      out[canon] = val;
    } else {
      // on garde les clés inconnues à part pour debug
      if (!out._raw) out._raw = {};
      out._raw[key] = val;
    }
  }

  // fusionne les query params aussi (au cas où)
  try {
    const u = new URL(req.url, 'https://x');
    for (const [k, v] of u.searchParams.entries()) {
      const canon = toCanon(k);
      if (!out[canon]) out[canon] = v;
    }
  } catch {}

  return out;
}

function detectLang(req, n) {
  const l = (n.lang || '').toLowerCase();
  if (l === 'fr' || l === 'en') return l;
  const al = String(req.headers['accept-language'] || '').toLowerCase();
  return al.startsWith('en') ? 'en' : 'fr';
}

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

const TYPE_META = {
  demo:    { color: '#2563eb' },
  pilot:   { color: '#16a34a' },
  support: { color: '#ea580c' }
};

// ---------- handler ----------
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const raw = await readRawBody(req);
    const parsed = parseBody(raw, req.headers['content-type']);
    const n = normalize(parsed, req);

    // honeypot
    if (n.website) return res.status(204).end();

    const lang = detectLang(req, n);
    const t = I18N[lang] || I18N.fr;
    const typeLabel = t.types[n.type] || n.type || '—';
    const badge = TYPE_META[n.type] || { color: '#475569' };

    const fullname = (n.fullname || '').trim();
    const email    = (n.email || '').trim();
    const org      = (n.org || '').trim();
    const subject  = (n.subject || '').trim() || 'Contact';
    const message  = (n.message || '').trim();

    if (!fullname || !email || !message) {
      console.warn('Missing fields - received keys:', Object.keys(parsed));
      console.warn('Normalized:', { fullname, email, message, other: n._raw || {} });
      return res.status(400).end('Missing required fields');
    }

    // destinataires
    const to = String(process.env.INTERNAL_NOTIFY || process.env.FROM_EMAIL || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    const from = { email: process.env.FROM_EMAIL, name: 'Bluekiosktech Blog' };

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
          <tr><td style="padding:8px 0;width:160px;color:#475569">${escapeHtml(t.labels.name)}</td>
              <td style="padding:8px 0;font-weight:600">${escapeHtml(fullname)}</td></tr>
          <tr><td style="padding:8px 0;color:#475569">${escapeHtml(t.labels.email)}</td>
              <td style="padding:8px 0"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding:8px 0;color:#475569">${escapeHtml(t.labels.org)}</td>
              <td style="padding:8px 0">${escapeHtml(org) || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#475569">${escapeHtml(t.labels.subject)}</td>
              <td style="padding:8px 0">${escapeHtml(subject)}</td></tr>
        </table>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
        <div><div style="color:#475569;margin-bottom:6px">${escapeHtml(t.labels.message)} :</div><div>${msgHtml}</div></div>

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
      to, from, replyTo: email,
      subject: `${t.subjectPrefix}: ${subject} — ${fullname}`,
      text, html
    });

    res.statusCode = 303; // See Other
    res.setHeader('Location', '/success.html');
    return res.end();
  } catch (err) {
    console.error('contact.js error:', err?.response?.body || err);
    return res.status(500).end('Email failed');
  }
};
