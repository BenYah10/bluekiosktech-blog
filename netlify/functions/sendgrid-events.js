// netlify/functions/sendgrid-events.js
// Vérification SIGNED Event Webhook (ECDSA) + update du lead dans Blobs

const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

function buildPemFromBase64Spki(b64) {
  const body = (b64 || "").replace(/\s+/g, "");
  const wrapped = body.replace(/(.{64})/g, "$1\n");
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----\n`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const pubKeyB64 = process.env.SENDGRID_EVENT_PUBLIC_KEY || "";
    if (!pubKeyB64) return { statusCode: 500, body: "Server misconfigured" };
    const pubKeyPem = buildPemFromBase64Spki(pubKeyB64);

    const sigHeader = event.headers["x-twilio-email-event-webhook-signature"];
    const tsHeader  = event.headers["x-twilio-email-event-webhook-timestamp"];
    if (!sigHeader || !tsHeader) return { statusCode: 401, body: "unauthorized" };

    const rawBodyBuf = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "", "utf8");

    const verify = crypto.createVerify("sha256");
    verify.update(Buffer.from(tsHeader, "utf8"));
    verify.update(rawBodyBuf);
    verify.end();

    const signatureDer = Buffer.from(sigHeader, "base64");
    const ok = verify.verify(pubKeyPem, signatureDer);
    if (!ok) return { statusCode: 401, body: "invalid signature" };

    // Signature OK → parse et log
    let events = [];
    try { events = JSON.parse(rawBodyBuf.toString("utf8") || "[]"); } catch {}

    const leads = getStore({ name: "leads", consistency: "strong" });

    for (const e of events) {
      console.log("sg_event", {
        event: e.event, email: e.email,
        sg_message_id: e.sg_message_id || e["sg_message_id"],
        timestamp: e.timestamp, category: e.category,
        custom_args: e.custom_args, reason: e.reason
      });

      // --- mise à jour du lead par message-id racine ---
      const root = ((e.sg_message_id || e["sg_message_id"] || "").toString()).split(".")[0];
      if (!root) continue;

      const map = await leads.getJSON(`msg:${root}`).catch(() => null);
      if (!map || !map.leadId) continue;

      const key = `lead:${map.leadId}`;
      const lead = (await leads.getJSON(key).catch(() => null)) || {};
      lead.status = e.event;
      lead.lastEvent = e.event;
      lead.lastUpdate = new Date((e.timestamp || Date.now()/1000) * 1000).toISOString();
      if (e.reason) lead.reason = e.reason;

      await leads.setJSON(key, lead);
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Webhook error:", err);
    return { statusCode: 400, body: "bad payload" };
  }
};
