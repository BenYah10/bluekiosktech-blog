// netlify/functions/sendgrid-events.js
// Reçoit les Event Webhook de SendGrid (Processed, Delivered, Opened, Bounced, etc.)
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const items = JSON.parse(event.body || "[]"); // SendGrid envoie un tableau d'événements
    for (const e of items) {
      // logs utiles pour Netlify → Functions → Logs
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
    return { statusCode: 200, body: "ok" }; // IMPORTANT: 2xx pour éviter les retries
  } catch (err) {
    console.error("Webhook parse error:", err);
    return { statusCode: 400, body: "bad payload" };
  }
};
