// /api/contact.js (Node 18, Serverless Function Vercel)
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// helpers
async function readBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}
function parseBody(raw, ctype='') {
  ctype = String(ctype).toLowerCase();
  if (ctype.includes('application/json')) {
    try { return JSON.parse(raw || '{}'); } catch { return {}; }
  }
  const params = new URLSearchParams(raw || '');
  const obj = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  return obj;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const raw = await readBody(req);
  const data = parseBody(raw, req.headers['content-type']);

  // honeypot
  if (data.website) return res.status(204).end();

  const fullname = (data.fullname || '').trim();
  const email    = (data.email || '').trim();
  const org      = (data.org || '').trim();
  const subject  = (data.subject || '').trim() || 'Contact';
  const type     = (data.type || '').trim();
  const message  = (data.message || '').trim();

  if (!fullname || !email || !message) {
    return res.status(400).end('Missing required fields');
  }

  const to   = process.env.INTERNAL_NOTIFY || process.env.FROM_EMAIL;
  const from = process.env.FROM_EMAIL;

  try {
    await sgMail.send({
      to,
      from,
      replyTo: email,
      subject: `Contact: ${subject} — ${fullname}`,
      text:
`Nom: ${fullname}
Email: ${email}
Organisation: ${org}
Type: ${type}

${message}

UA: ${req.headers['user-agent'] || ''}`,
    });

    // Redirige proprement le POST vers une page GET
    res.statusCode = 303; // "See Other"
    res.setHeader('Location', '/success.html');
    return res.end();
  } catch (err) {
    console.error('SendGrid error:', err?.response?.body || err);
    return res.status(500).end('Email failed');
  }
};
