// netlify/functions/submission-created.cjs
'use strict';

function cors() {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

exports.handler = async (event) => {
  try {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: cors(), body: '' };
    }

    // Santé
    if (event.httpMethod === 'GET') {
      return { statusCode: 200, headers: cors(), body: 'OK - submission-created is running' };
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: cors(), body: 'Method Not Allowed' };
    }

    // Logging utile en debug
    console.log('Incoming POST', { headers: event.headers, body: event.body });

    // On accepte { payload:{data:{...}} } (Netlify Forms), { data:{...} } ou { ... } direct
    let payload = {};
    try { payload = JSON.parse(event.body || '{}'); }
    catch (e) {
      console.error('JSON parse error:', e);
      return { statusCode: 400, headers: cors(), body: 'Bad JSON' };
    }

    const data = (payload && (payload.payload?.data || payload.data)) || payload || {};

    // Routing d’après le type
    const type = String(data.type || data.Type || '').toLowerCase();
    const ROUTE = {
      demo: process.env.MAIL_TO_DEMO,
      pilot: process.env.MAIL_TO_PILOT,
      support: process.env.MAIL_TO_SUPPORT,
    };
    const to = ROUTE[type] || process.env.ROUTE_DEFAULT || process.env.MAIL_TO_SUPPORT;

    const sgKey = process.env.SENDGRID_API_KEY;
    if (!sgKey) {
      console.error('Missing SENDGRID_API_KEY');
      return { statusCode: 500, headers: cors(), body: 'Missing SENDGRID_API_KEY' };
    }

    const from = process.env.MAIL_FROM || 'do-not-reply@bluekiosk.tech';
    const subject = `[${type || 'contact'}] ${data.subject || 'Nouveau message'}`;
    const text =
      `Nom: ${data.name || data.Nom || ''}\n` +
      `Email: ${data.email || data.Email || ''}\n` +
      `Organisation: ${data.org || data.Organisation || ''}\n` +
      `Sujet: ${data.subject || ''}\n\n` +
      `Message:\n${data.message || data.Message || ''}\n`;

    // Appel SendGrid HTTP API
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sgKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from, name: 'Bluekiosk Blog' },
        subject,
        content: [{ type: 'text/plain', value: text }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('SendGrid error', res.status, errText);
      return { statusCode: 502, headers: cors(), body: `SendGrid error ${res.status}` };
    }

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('UNHANDLED ERROR:', err);
    return { statusCode: 500, headers: cors(), body: 'Internal Server Error' };
  }
};
