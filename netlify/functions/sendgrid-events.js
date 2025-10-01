// netlify/functions/sendgrid-events.js
// Vérifie la signature SendGrid (Ed25519) + logge les événements

const nacl = require("tweetnacl");

// util: base64 -> Uint8Array
function b64ToUint8(base64) {
  return new Uint8Array(Buffer.from(base64, "base64"));
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const pubKey = process.env.SENDGRID_EVENT_PUBLIC_KEY || "";
    if (!pubKey) {
      console.error("Missing SENDGRID_EVENT_PUBLIC_KEY");
      return { statusCode: 500, body: "Server misconfigured" };
    }

    // headers en minuscules via Netlify
    const sig = event.headers["x-twilio-email-event-webhook-signature"];
    const ts  = event.headers["x-twilio-email-event-webhook-timestamp"];

    if (!sig || !ts) {
      console.warn("Missing signature headers");
      return { statusCode: 401, body: "unauthorized" };
    }

    // body brut exactement comme reçu
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body || "";

    // Message = timestamp + body (concat strings)
    const msgBytes = new TextEncoder().encode(ts + rawBody);
    const sigBytes = b64ToUint8(sig);
    const keyBytes = b64ToUint8(pubKey);

    const ok = nacl.sign.detached.verify(msgBytes, sigBytes, keyBytes);
    if (!ok) {
      console.warn("Invalid SendGrid signature");
      return { statusCode: 401, body: "invalid signature" };
    }

    // Signature OK → on peut parser les événements
    const items = JSON.parse(rawBody || "[]");
    for (const e of items) {
      console.log("sg_event", {
        event: e.event,
        email: e.email,
        sg_message_id: e.sg_message_id || e["sg_message_id"],
        timestamp: e.timestamp,
        category: e.category,
        custom_args: e.custom_args,
        reason: e.reason,
      });
    }

    return { statusCode: 200, body: "ok" }; // 2xx = no retry
  } catch (err) {
    console.error("Webhook error:", err);
    return { statusCode: 400, body: "bad payload" };
  }
};
