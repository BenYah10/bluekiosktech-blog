// netlify/functions/submission-created.js
// Route Netlify Forms → SendGrid
// Utilise SendGrid HTTP API (pas besoin du SDK)

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";

exports.handler = async (event) => {
  // Netlify envoie l'évènement "submission-created" en POST JSON
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const data = payload.data || {};

    // Champs du formulaire (côté contact.html)
    const fullName =
      data.Nom ||
      data.nom ||
      data.fullname ||
      data.full_name ||
      data.name ||
      "(Sans nom)";
    const email = data.Email || data.email || "";
    const org = data.Organisation || data.organisation || data.company || "";
    const subject = data.Sujet || data.subject || "(Sans sujet)";
    const type = (data.type || data.Type || "").toString().trim().toLowerCase();
    const message = data.Message || data.message || "";

    // Récup env vars
    const API_KEY = process.env.SENDGRID_API_KEY;
    const MAIL_FROM = process.env.MAIL_FROM || "do-not-reply@bluekiosk.tech";
    const TO_DEMO = process.env.MAIL_TO_DEMO;
    const TO_PILOT = process.env.MAIL_TO_PILOT;
    const TO_SUPPORT = process.env.MAIL_TO_SUPPORT;

    if (!API_KEY) {
      console.error("Missing SENDGRID_API_KEY");
      return { statusCode: 500, body: "Missing SENDGRID_API_KEY" };
    }

    // Routage selon le champ "type"
    const ROUTE = {
      demo: TO_DEMO,
      "site pilote": TO_PILOT,
      pilote: TO_PILOT,
      support: TO_SUPPORT,
    };
    const toEmail = ROUTE[type] || TO_DEMO || MAIL_FROM;

    // Corps du mail (texte + HTML simple)
    const plain = [
      `Type de demande : ${type || "non précisé"}`,
      `Nom : ${fullName}`,
      `Email : ${email}`,
      `Organisation : ${org}`,
      `Sujet : ${subject}`,
      "",
      "Message :",
      message,
    ].join("\n");

    const html = `
      <h2>Nouvelle demande via le formulaire</h2>
      <p><strong>Type :</strong> ${type || "non précisé"}</p>
      <p><strong>Nom :</strong> ${fullName}</p>
      <p><strong>Email :</strong> ${email}</p>
      <p><strong>Organisation :</strong> ${org}</p>
      <p><strong>Sujet :</strong> ${subject}</p>
      <hr />
      <p>${(message || "").replace(/\n/g, "<br>")}</p>
    `;

    // Payload SendGrid
    const body = {
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: MAIL_FROM, name: "BlueKioskTech Blog" },
      reply_to: email ? { email, name: fullName } : undefined,
      subject: subject || "Nouveau message du formulaire",
      content: [
        { type: "text/plain", value: plain },
        { type: "text/html", value: html },
      ],
    };

    // Envoi
    const res = await fetch(SENDGRID_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // SendGrid renvoie 202 Accepted si OK
    if (res.status === 202) {
      return { statusCode: 200, body: "OK" };
    }

    const errText = await res.text();
    console.error("SendGrid error:", res.status, errText);
    return {
      statusCode: 502,
      body: `SendGrid error ${res.status}: ${errText}`,
    };
  } catch (err) {
    console.error("Function error:", err);
    return { statusCode: 500, body: "Internal error" };
  }
};
