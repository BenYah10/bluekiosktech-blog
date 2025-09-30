// netlify/functions/submission-created.js
// Accept both: Netlify Forms webhook payload OR direct JSON from the browser
const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";

const ALLOWED = (process.env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
const ORIGIN_FALLBACK = "*"; // en dev uniquement; en prod on utilisera ALLOWED

exports.handler = async (event) => {
  const origin = event.headers.origin || "";
  const allowOrigin = ALLOWED.includes(origin) ? origin : (process.env.NODE_ENV === "development" ? ORIGIN_FALLBACK : "");

  // Préflight CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Max-Age": "86400",
      },
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    // 1) Cas Netlify Forms: { payload: { data: {...}, form_name: "contact" } }
    // 2) Cas appel direct:  { data: {...}, form_name: "contact" }
    const payload = body.payload || body || {};
    const data = payload.data || {};
    const formName = payload.form_name || payload.formName || "contact";

    const fullName = data.Nom || data.name || data.fullname || "(Sans nom)";
    const email    = data.Email || data.email || "";
    const org      = data.Organisation || data.org || "";
    const subject  = data.Sujet || data.subject || "(Sans sujet)";
    const type     = (data.Type || "").toString().trim().toLowerCase(); // demo|pilot|support
    const message  = data.Message || data.message || "";

    const ROUTE = {
      demo:    process.env.MAIL_TO_DEMO    || process.env.ROUTE_DEMO,
      pilot:   process.env.MAIL_TO_PILOT   || process.env.ROUTE_PILOT,
      support: process.env.MAIL_TO_SUPPORT || process.env.ROUTE_SUPPORT,
    };
    const toEmail = ROUTE[type] || process.env.MAIL_TO_DEFAULT || process.env.ROUTE_DEFAULT || "info@bluekiosktech.ca";

    const FROM_EMAIL = process.env.MAIL_FROM || "no-reply@bluekiosktech.ca";
    const FROM_NAME  = process.env.MAIL_FROM_NAME || "BlueKioskTech Blog";
    const BCC_EMAIL  = process.env.MAIL_BCC || process.env.EMAIL_BCC || null;
    const API_KEY    = process.env.SENDGRID_API_KEY;

    if (!API_KEY) return { statusCode: 500, body: "Missing SENDGRID_API_KEY" };

    const date = new Date().toLocaleString("fr-CA", { hour12: false });
    const mailSubject = `[${formName.toUpperCase()} · ${type || "unspecified"}] ${subject} — ${fullName} (${date})`;

    const text = `
Type : ${type || "(non renseigné)"}
Nom  : ${fullName}
Email: ${email}
Org  : ${org}
Sujet: ${subject}

Message:
${message}
`.trim();

    const html = `
      <h2>Nouvelle soumission “${formName}”</h2>
      <ul>
        <li><strong>Type :</strong> ${type || "(non renseigné)"}</li>
        <li><strong>Nom :</strong> ${fullName}</li>
        <li><strong>Email :</strong> ${email}</li>
        <li><strong>Organisation :</strong> ${org}</li>
        <li><strong>Sujet :</strong> ${subject}</li>
      </ul>
      <h3>Message</h3>
      <pre style="white-space:pre-wrap">${escapeHtml(message)}</pre>
    `;

    const personalization = { to: [{ email: toEmail }], subject: mailSubject };
    if (BCC_EMAIL) personalization.bcc = [{ email: BCC_EMAIL }];

    const sgBody = {
      personalizations: [personalization],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      reply_to: email ? { email } : undefined,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html",  value: html },
      ],
    };

    const res = await fetch(SENDGRID_API, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(sgBody),
});

if (!res.ok) {
  const body = await res.text();
  console.error("SendGrid error:", res.status, body);
  return { statusCode: 500, body: "SendGrid error" };
}

console.log("SendGrid OK 202 for", toEmail, "subject:", mailSubject);

    });

    const headers = allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin } : {};
    if (!res.ok) {
      const errText = await res.text();
      console.error("SendGrid error:", res.status, errText);
      return { statusCode: 502, headers, body: "SendGrid delivery failed" };
    }

    return { statusCode: 200, headers, body: "OK" };
  } catch (e) {
    console.error("Function error:", e);
    return { statusCode: 500, body: "Function error" };
  }
};

function escapeHtml(str = "") {
  return str.toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

