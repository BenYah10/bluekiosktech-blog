// netlify/functions/sendgrid-events.js
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Vérif d'un token simple passé dans l'URL:  /.netlify/functions/sendgrid-events?token=XYZ
  const token = event.queryStringParameters?.token || "";
  if (!process.env.SENDGRID_WEBHOOK_TOKEN || token !== process.env.SENDGRID_WEBHOOK_TOKEN) {
    console.warn("Invalid webhook token");
    return { statusCode: 401, body: "unauthorized" };
  }

  try {
    const items = JSON.parse(event.body || "[]");
    for (const e of items) {
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
    console.error("Webhook parse error:", err);
    return { statusCode: 400, body: "bad payload" };
  }
};
