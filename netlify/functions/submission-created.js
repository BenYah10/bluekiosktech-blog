// submission-created.js — Version DEBUG
// Node 18+ sur Netlify => fetch disponible nativement

// --- CORS ---
const ALLOWED_ORIGIN = "*"; // tu peux mettre ton domaine si tu veux restreindre
const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Helpers ---
const reply = (code, body) => ({
  statusCode: code,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const env = (k) => process.env[k] || "";

// --- SendGrid HTTP API ---
async function sendWithSendGrid({ to, from, subject, html }) {
  const key = env("SENDGRID_API_KEY");
  if (!key) throw new Error("SENDGRID_API_KEY is missing");

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SendGrid HTTP ${res.status}: ${text}`);
  }
}

// --- Normalisation du payload ---
function normalize(event) {
  // Netlify Forms => event.body = { payload: { data: {...} } } (JSON)
  // Test manuel => event.body = {...} ou { payload: { data: {...} } }
  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    // rien
  }
  const data = body?.payload?.data || body?.data || body || {};

  // Autoriser aussi les champs en minuscules
  const Nom = data.Nom || data.nom || data.name || "";
  const Email = data.Email || data.email || "";
  const Organisation = data.Organisation || data.organisation || data.org || "";
  const Subject = data.Subject || data.subject || "";
  const Type = (data.Type || data.type || "demo").toString().trim().toLowerCase();
  const Message = data.Message || data.message || "";

  return { Nom, Email, Organisation, Subject, Type, Message, raw: data };
}

// --- Rendu HTML simple ---
function renderHTML({ Nom, Email, Organisation, Subject, Type, Message }) {
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  }[c]));
  return `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:16px">
      <h2>📨 Nouvelle demande (${esc(Type)})</h2>
      <p><b>Nom :</b> ${esc(Nom) || "(n/c)"}<br/>
         <b>Email :</b> ${esc(Email) || "(n/c)"}<br/>
         <b>Organisation :</b> ${esc(Organisation) || "(n/c)"}</p>
      <p><b>Sujet :</b> ${esc(Subject) || "(Sans sujet)"}</p>
      <p><b>Message :</b><br/>${esc(Message) || "(vide)"}</p>
      <hr/>
      <small>Envoi automatique – BlueKioskTech</small>
    </div>
  `;
}

// --- Destinataire selon le type ---
function pickRecipient(type) {
  const map = {
    demo: env("MAIL_TO_DEMO"),
    pilot: env("MAIL_TO_PILOT"),
    support: env("MAIL_TO_SUPPORT"),
  };
  return map[type] || env("MAIL_TO_DEMO") || env("MAIL_TO_SUPPORT") || env("MAIL_TO_PILOT");
}

// --- Handler ---
exports.handler = async (event) => {
  // Preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  if (event.httpMethod !== "POST") {
    return reply(405, { ok: false, error: "Method Not Allowed" });
  }

  try {
    const { Nom, Email, Organisation, Subject, Type, Message, raw } = normalize(event);

    // Log utile (visible dans Functions logs)
    console.log("Incoming data:", { Nom, Email, Organisation, Subject, Type });

    // Garde-fous basiques
    if (!Email) return reply(400, { ok: false, error: "Email is required" });

    const to = pickRecipient(Type);
    const from = env("MAIL_FROM");
    if (!from) return reply(500, { ok: false, error: "MAIL_FROM is missing" });
    if (!to) return reply(500, { ok: false, error: "No recipient configured for this Type" });

    const subject = Subject || `[${Type}] Nouveau message`;
    const html = renderHTML({ Nom, Email, Organisation, Subject: subject, Type, Message });

    await sendWithSendGrid({ to, from, subject, html });

    return reply(200, { ok: true, to, subject });
  } catch (err) {
    console.error("Function error:", err);
    return reply(500, { ok: false, error: err.message || "Internal error" });
  }
};
