// netlify/functions/sendgrid-events.js
// Vérification SIGNED Event Webhook SendGrid (ECDSA P-256, signature DER)

const crypto = require("crypto");

// Construit un PEM SPKI à partir de la clé publique base64 affichée par SendGrid
function buildPemFromBase64Spki(b64) {
  // optionnel: wrap en lignes de 64 chars pour la lisibilité
  const body = (b64 || "").replace(/\s+/g, "");
  const wrapped = body.replace(/(.{64})/g, "$1\n");
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----\n`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const pubKeyB64 = process.env.SENDGRID_EVENT_PUBLIC_KEY || "";
    if (!pubKeyB64) {
      console.error("Missing SENDGRID_EVENT_PUBLIC_KEY");
      return { statusCode: 500, body: "Server misconfigured" };
    }
    const pubKeyPem = buildPemFromBase64Spki(pubKeyB64);

    // Headers (Netlify → lowercase)
    const sigHeader = event.headers["x-twilio-email-event-webhook-signature"]; // base64 DER (variable length ~70-72)
    const tsHeader  = event.headers["x-twilio-email-event-webhook-timestamp"];

    if (!sigHeader || !tsHeader) {
      console.warn("Missing signature headers", { hasSig: !!sigHeader, hasTs: !!tsHeader });
      return { statusCode: 401, body: "unauthorized" };
    }

    // Corps brut EXACT (ne pas re-JSONifier)
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "", "utf8");

    // Concat timestamp (ASCII) + body bytes, puis vérifie ECDSA (SHA-256)
    const verify = crypto.createVerify("sha256");
    verify.update(Buffer.from(tsHeader, "utf8"));
    verify.update(rawBody);
    verify.end();

    const signatureDer = Buffer.from(sigHeader, "base64"); // DER variable length
    const ok = verify.verify(pubKeyPem, signatureDer);

    if (!ok) {
      console.warn("Signature verification failed");
      return { statusCode: 401, body: "invalid signature" };
    }

    // Signature OK → parser et log
    let events = [];
    try { events = JSON.parse(rawBody.toString("utf8") || "[]"); } catch {}
    for (const e of events) {
      console.log("sg_event", {
        event: e.event,
        email: e.email,
        sg_message_id: e.sg_message_id || e["sg_message_id"],
        timestamp: e.timestamp,
        category: e.category,
        custom_args: e.custom_args,
        reason: e.reason
      });
    }

    // Notif Slack sur incidents
const slackUrl = process.env.SLACK_WEBHOOK_URL;
const INCIDENTS = new Set(["bounced", "dropped", "spamreport"]);
for (const e of events) {
  if (!slackUrl || !INCIDENTS.has(e.event)) continue;
  const txt =
    `✉️ *${e.event.toUpperCase()}* — ${e.email}\n` +
    `• message_id: ${e.sg_message_id}\n` +
    (e.reason ? `• reason: ${e.reason}\n` : "") +
    (e.category ? `• categories: ${JSON.stringify(e.category)}\n` : "") +
    (e.custom_args ? `• custom_args: ${JSON.stringify(e.custom_args)}\n` : "");
  await fetch(slackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: txt })
  });
}


    return { statusCode: 200, body: "ok" }; // important: 2xx évite les retries
  } catch (err) {
    console.error("Webhook error:", err);
    return { statusCode: 400, body: "bad payload" };
  }
};

