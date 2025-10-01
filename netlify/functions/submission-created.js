// netlify/functions/submission-created.js
// Route les emails selon "Type" depuis un formulaire Netlify Forms
// Envoi via SendGrid API (sans dépendance externe)

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";

exports.handler = async (event) => {
  try {
    // L’événement arrive en JSON { payload: {...} }
    const body    = JSON.parse(event.body || "{}");
    const payload = body.payload || {};
    const data    = payload.data || {};
    const formName = payload.form_name || payload.formName || "contact";

    // Champs attendus (alignés avec contact.html)
    const fullName = data.Nom           || data.name      || data.fullname || "(Sans nom)";
    const email    = data.Email         || data.email     || "";
    const org      = data.Organisation  || data.org       || "";
    const subject  = data.Sujet         || data.subject   || "(Sans sujet)";
    const type     = (data.Type || "").toString().trim().toLowerCase(); // demo|pilot|support
    const message  = data.Message       || data.message   || "";

    // --- Routage : MAIL_TO_* prioritaire, sinon ROUTE_* (fallback) ---
    const ROUTE = {
      demo:    process.env.MAIL_TO_DEMO    || process.env.ROUTE_DEMO,
      pilot:   process.env.MAIL_TO_PILOT   || process.env.ROUTE_PILOT,
      support: process.env.MAIL_TO_SUPPORT || process.env.ROUTE_SUPPORT,
    };
    const TO_EMAIL =
      ROUTE[type] ||
      process.env.MAIL_TO_DEFAULT ||
      process.env.ROUTE_DEFAULT ||
      "info@bluekiosktech.ca"; // dernier recours

    // --- Paramètres d’envoi ---
    const FROM_EMAIL = process.env.MAIL_FROM || "do-not-reply@bluekiosk.tech";
    const FROM_NAME  = process.env.MAIL_FROM_NAME || "BlueKioskTech Blog";
    const BCC_EMAIL  = process.env.MAIL_BCC || process.env.EMAIL_BCC || null; // optionnel
    const API_KEY    = process.env.SENDGRID_API_KEY;

    if (!API_KEY) {
      console.error("SENDGRID_API_KEY manquant.");
      return { statusCode: 500, body: "SENDGRID_API_KEY manquant" };
    }

    // --- Sujet + contenus ---
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

    // --- reply_to : l'adresse de la personne qui a rempli le formulaire (si valide) ---
    const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    const REPLY_TO = isEmail(email) ? { email, name: fullName } : undefined;

    // === PAYLOAD SENDGRID (avec tracking + tags) ===
    const sgBody = {
      personalizations: [
        {
          to: [{ email: TO_EMAIL }],
          ...(BCC_EMAIL ? { bcc: [{ email: BCC_EMAIL }] } : {}),
          subject: mailSubject,
          // custom_args ici s'applique à cette personnalisation (optionnel)
        },
      ],
      from:     { email: FROM_EMAIL, name: FROM_NAME },
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      content: [
        { type: "text/plain", value: plainText },
        { type: "text/html",  value: html },
      ],

      // --- Ajouts recommandés pour enrichir l’Activity ---
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking:  { enable: true },
      },
      categories: ["bluekiosktech-blog", "contact-form"],
      custom_args: {
        form: formName,
        type,
        routed_to: TO_EMAIL,
      },
    };

    // --- Envoi ---
    const res = await fetch(SENDGRID_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sgBody),
    });

    const xMsgId = res.headers.get("x-message-id");
    console.log("SendGrid status:", res.status, "x-message-id:", xMsgId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("SendGrid error body:", errText);
      return { statusCode: 502, body: `SendGrid error (${res.status})` };
    }

    // Tout est bon
    return { statusCode: 200, body: "OK" };
  } catch (e) {
    console.error("Function error:", e);
    return { statusCode: 500, body: "Function error" };
  }
};

// Utilitaire pour échapper le HTML dans <pre>
function escapeHtml(str = "") {
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
