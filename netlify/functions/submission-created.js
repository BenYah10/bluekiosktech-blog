// netlify/functions/submission-created.js
// Router d'emails selon le champ "Type" d'un formulaire Netlify Forms
// Envoi via SendGrid API (sans dépendance) — configure les variables d'env ci-dessous.

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";

exports.handler = async (event) => {
  try {
    // L'événement "submission-created" arrive en JSON { payload: {...} }
    const body = JSON.parse(event.body || "{}");
    const payload = body.payload || {};
    const data = payload.data || {}; // champs du formulaire
    const formName = payload.form_name || payload.formName || "contact";

    // Champs attendus (adaptés à ton contact.html)
    const fullName = data.Nom || data.name || data.fullname || "(Sans nom)";
    const email = data.Email || data.email || "";
    const org = data.Organisation || data.org || "";
    const subject = data.Sujet || data.subject || "(Sans sujet)";
    const type = (data.Type || "").toString().trim().toLowerCase(); // demo|pilot|support
    const message = data.Message || data.message || "";

    // ---- Routage (via variables d'environnement) ----
    const ROUTE = {
      demo: process.env.ROUTE_DEMO,
      pilot: process.env.ROUTE_PILOT,
      support: process.env.ROUTE_SUPPORT,
    };
    const toEmail =
      ROUTE[type] ||
      process.env.ROUTE_DEFAULT ||
      "info@bluekiosktech.ca"; // fallback

    // ---- Paramètres d'envoi ----
    const FROM_EMAIL = process.env.MAIL_FROM || "no-reply@bluekiosktech.ca";
    const FROM_NAME = process.env.MAIL_FROM_NAME || "Bluekiosktech Blog";
    const API_KEY = process.env.SENDGRID_API_KEY;

    if (!API_KEY) {
      console.error("SENDGRID_API_KEY manquant.");
      return { statusCode: 500, body: "Missing SENDGRID_API_KEY" };
    }

    // Sujet horodaté + Type
    const date = new Date().toLocaleString("fr-CA", { hour12: false });
    const mailSubject = `[${formName.toUpperCase()} · ${type || "unspecified"}] ${subject} — ${fullName} (${date})`;

    // Corps en texte brut
    const text = `
Nouvelle soumission du formulaire "${formName}"

Type : ${type || "(non renseigné)"}
Nom  : ${fullName}
Email: ${email}
Org  : ${org}
Sujet: ${subject}

Message:
${message}

— Fin du message —
    `.trim();

    // Variante HTML simple
    const html = `
      <h2>Nouvelle soumission &ldquo;${formName}&rdquo;</h2>
      <ul>
        <li><strong>Type :</strong> ${type || "(non renseigné)"}</li>
        <li><strong>Nom :</strong> ${fullName}</li>
        <li><strong>Email :</strong> ${email}</li>
        <li><strong>Organisation :</strong> ${org}</li>
        <li><strong>Sujet :</strong> ${subject}</li>
      </ul>
      <h3>Message</h3>
      <pre style="white-space:pre-wrap">${escapeHtml(message)}</pre>
      <hr>
      <p style="color:#666">© Bluekiosktech — ${new Date().getFullYear()}</p>
    `;

    // Construction de la requête SendGrid
    const sgBody = {
      personalizations: [{ to: [{ email: toEmail }], subject: mailSubject }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      reply_to: email ? { email } : undefined,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
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
      const errText = await res.text();
      console.error("SendGrid error:", res.status, errText);
      return { statusCode: 502, body: "SendGrid delivery failed" };
    }

    console.log(`Routé vers ${toEmail} (type=${type})`);
    return { statusCode: 200, body: "OK" };
  } catch (e) {
    console.error("Function error:", e);
    return { statusCode: 500, body: "Function error" };
  }
};

// utilitaire simple pour échapper le HTML dans le <pre>
function escapeHtml(str = "") {
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
