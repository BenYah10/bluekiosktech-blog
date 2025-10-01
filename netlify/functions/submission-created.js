// netlify/functions/submission-created.js
// Envoi via SendGrid + enregistrement du lead dans Netlify Blobs

const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";

exports.handler = async (event) => {
  try {
    const body    = JSON.parse(event.body || "{}");
    const payload = body.payload || {};
    const data    = payload.data || {};
    const formName = payload.form_name || payload.formName || "contact";

    const fullName = data.Nom           || data.name      || data.fullname || "(Sans nom)";
    const email    = data.Email         || data.email     || "";
    const org      = data.Organisation  || data.org       || "";
    const subject  = data.Sujet         || data.subject   || "(Sans sujet)";
    const type     = (data.Type || "").toString().trim().toLowerCase(); // demo|pilot|support
    const message  = data.Message       || data.message   || "";

    const ROUTE = {
      demo:    process.env.MAIL_TO_DEMO    || process.env.ROUTE_DEMO,
      pilot:   process.env.MAIL_TO_PILOT   || process.env.ROUTE_PILOT,
      support: process.env.MAIL_TO_SUPPORT || process.env.ROUTE_SUPPORT,
    };
    const TO_EMAIL =
      ROUTE[type] ||
      process.env.MAIL_TO_DEFAULT ||
      process.env.ROUTE_DEFAULT ||
      "info@bluekiosktech.ca";

    const FROM_EMAIL = process.env.MAIL_FROM || "do-not-reply@bluekiosk.tech";
    const FROM_NAME  = process.env.MAIL_FROM_NAME || "BlueKioskTech Blog";
    const BCC_EMAIL  = process.env.MAIL_BCC || process.env.EMAIL_BCC || null;
    const API_KEY    = process.env.SENDGRID_API_KEY;

    if (!API_KEY) {
      console.error("SENDGRID_API_KEY manquant.");
      return { statusCode: 500, body: "SENDGRID_API_KEY manquant" };
    }

    const dateISO = new Date();
    const dateStr = dateISO.toLocaleString("fr-CA", { hour12: false });
    const mailSubject = `[${(formName || "form").toUpperCase()} · ${type || "unspecified"}] ${subject} — ${fullName} (${dateStr})`;

    const plainText = `
Nouvelle soumission du formulaire "${formName}"

Type : ${type || "(non renseigné)"}
Nom  : ${fullName}
Email: ${email}
Organisation : ${org}
Sujet: ${subject}

Message:
${message}

— Fin du message —
    `.trim();

    const html = `
      <h2>Nouvelle soumission “${escapeHtml(formName)}”</h2>
      <ul>
        <li><strong>Type :</strong> ${escapeHtml(type || "(non renseigné)")}</li>
        <li><strong>Nom :</strong> ${escapeHtml(fullName)}</li>
        <li><strong>Email :</strong> ${escapeHtml(email)}</li>
        <li><strong>Organisation :</strong> ${escapeHtml(org)}</li>
        <li><strong>Sujet :</strong> ${escapeHtml(subject)}</li>
      </ul>
      <h3>Message</h3>
      <pre style="white-space:pre-wrap;word-wrap:break-word">${escapeHtml(message)}</pre>
      <hr>
      <p style="color:#666">© BlueKioskTech — ${new Date().getFullYear()}</p>
    `;

    const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    const REPLY_TO = isEmail(email) ? { email, name: fullName } : undefined;

    const sgBody = {
      personalizations: [
        {
          to: [{ email: TO_EMAIL }],
          ...(BCC_EMAIL ? { bcc: [{ email: BCC_EMAIL }] } : {}),
          subject: mailSubject,
        },
      ],
      from:     { email: FROM_EMAIL, name: FROM_NAME },
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      content: [
        { type: "text/plain", value: plainText },
        { type: "text/html",  value: html },
      ],
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking:  { enable: true },
      },
      categories: ["bluekiosktech-blog", "contact-form"],
      custom_args: { form: formName, type, routed_to: TO_EMAIL },
    };

    const res = await fetch(SENDGRID_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sgBody),
    });

    const xMsgId = res.headers.get("x-message-id") || "";
    console.log("SendGrid status:", res.status, "x-message-id:", xMsgId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("SendGrid error body:", errText);
      return { statusCode: 502, body: `SendGrid error (${res.status})` };
    }

    // === Enregistrement du lead dans Netlify Blobs ===
    const leads = getStore({ name: "leads", consistency: "strong" });
    const id = payload.id || crypto.randomUUID();
    const msgRoot = xMsgId.split(".")[0] || "";

    const lead = {
      id,
      createdAt: new Date().toISOString(),
      form: formName,
      type,
      fullName,
      email,
      org,
      subject,
      message,
      to: TO_EMAIL,
      x_message_id: xMsgId,
      status: "sent"
    };

    // clé principale + index par message-id pour mise à jour via webhook
    await leads.setJSON(`lead:${id}`, lead);
    if (msgRoot) {
      await leads.setJSON(`msg:${msgRoot}`, { leadId: id });
    }

    return { statusCode: 200, body: "OK" };
  } catch (e) {
    console.error("Function error:", e);
    return { statusCode: 500, body: "Function error" };
  }
};

function escapeHtml(str = "") {
  return str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
