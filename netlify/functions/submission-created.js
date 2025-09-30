// netlify/functions/submission-created.js
// Reçoit l’événement submission-created de Netlify Forms et envoie l'email via SendGrid

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";

exports.handler = async (event) => {
  const key = process.env.SENDGRID_API_KEY || "";
  if (!key) {
    console.error("[SG] Missing SENDGRID_API_KEY");
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "Missing SENDGRID_API_KEY" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const payload = body.payload || {};
    const data = payload.data || {};
    const formName = payload.form_name || payload.formName || "contact";

    // Champs attendus (adapter les noms si besoin)
    const fullName = data.fullName || data.Nom || data["full-name"] || "(Sans nom)";
    const email = data.email || data.Email || "";
    const org = data.org || data.Organisation || "";
    const subject = data.subject || data.Sujet || "(Sans sujet)";
    const type = (data.type || data.Type || "").toString().trim().toLowerCase();
    const message = data.message || data.Message || "";

    // Routing
    const ROUTE = {
      demo: process.env.MAIL_TO_DEMO,
      pilot: process.env.MAIL_TO_PILOT,
      support: process.env.MAIL_TO_SUPPORT,
    };
    const toEmail =
      ROUTE[type] ||
      process.env.MAIL_TO_DEFAULT ||
      "info@bluekiosktech.ca"; // fallback

    const fromEmail = process.env.MAIL_FROM || "do-not-reply@bluekiosk.tech";

    // Construire le contenu
    const textLines = [
      `Formulaire : ${formName}`,
      `Type : ${type || "(non précisé)"}`,
      `Nom : ${fullName}`,
      `Email : ${email || "(non fourni)"}`,
      `Organisation : ${org || "(non fourni)"}`,
      "",
      `Message :`,
      message || "(vide)",
    ];

    const html = `
      <h2>Nouveau message – ${formName}</h2>
      <p><strong>Type :</strong> ${type || "(non précisé)"}</p>
      <p><strong>Nom :</strong> ${fullName}</p>
      <p><strong>Email :</strong> ${email || "(non fourni)"}</p>
      <p><strong>Organisation :</strong> ${org || "(non fourni)"}</p>
      <hr/>
      <p><strong>Message :</strong><br/>${(message || "(vide)")
        .replace(/\n/g, "<br/>")}</p>
    `;

    const sgPayload = {
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: fromEmail, name: "BlueKioskTech – Blog" },
      reply_to: email ? { email, name: fullName } : undefined,
      subject: subject || `[${formName}] Nouveau message`,
      content: [
        { type: "text/plain", value: textLines.join("\n") },
        { type: "text/html", value: html },
      ],
    };

    const res = await fetch(SENDGRID_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sgPayload),
    });

    const resText = await res.text();
    console.log("[SG] Status:", res.status);
    if (resText) console.log("[SG] Body:", resText);

    if (res.status >= 200 && res.status < 300) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
      };
    }

    // Erreur SendGrid => renvoyer le détail
    return {
      statusCode: 502,
      body: JSON.stringify({
        ok: false,
        error: "SendGridError",
        status: res.status,
        body: resText,
      }),
    };
  } catch (err) {
    console.error("[Function] Uncaught error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: String(err) }),
    };
  }
};
