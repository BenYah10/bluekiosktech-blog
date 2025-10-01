// netlify/functions/sendgrid-events.js
// Vérification Ed25519 des Event Webhook SendGrid (signature signée)

const nacl = require("tweetnacl");

// base64url -> Uint8Array (robuste: gère -, _, padding)
function b64urlToUint8(s = "") {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return new Uint8Array(Buffer.from(b64, "base64"));
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

    // Netlify met les headers en minuscules
    const h = event.headers || {};
    const sigHeader = h["x-twilio-email-event-webhook-signature"]; // base64url
    const tsHeader  = h["x-twilio-email-event-webhook-timestamp"];

    if (!sigHeader || !tsHeader) {
      console.warn("Missing signature headers", { hasSig: !!sigHeader, hasTs: !!tsHeader });
      return { statusCode: 401, body: "unauthorized" };
    }

    // Corps brut EXACT (attention à isBase64Encoded)
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : (event.body || "");

    // Concat timestamp + body puis vérifie la signature
    const msgBytes = new TextEncoder().encode(tsHeader + rawBody);
    const sigBytes = b64urlToUint8(sigHeader);          // <= base64url safe
    const keyBytes = b64urlToUint8(pubKeyB64);          // clé publique base64 fournie par SendGrid

    // Garde-fous utiles en debug
    if (sigBytes.length !== nacl.sign.signatureLength) {
      console.warn("Bad signature length", sigBytes.length, "(expected 64)");
      return { statusCode: 401, body: "invalid signature" };
    }
    if (keyBytes.length !== nacl.sign.publicKeyLength) {
      console.warn("Bad public key length", keyBytes.length, "(expected 32) — check SENDGRID_EVENT_PUBLIC_KEY");
      return { statusCode: 401, body: "invalid public key" };
    }

    const ok = nacl.sign.detached.verify(msgBytes, sigBytes, keyBytes);
    if (!ok) {
      console.warn("Signature verification failed");
      return { statusCode: 401, body: "invalid signature" };
    }

    // Signature OK → parse et log
    const events = JSON.parse(rawBody || "[]");
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

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Webhook error:", err);
    return { statusCode: 400, body: "bad payload" };
  }
};
