// netlify/functions/submission-created.js
exports.handler = async (event) => {
  try {
    // 1) GET = ping de santé
    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/plain" },
        body: "OK - submission-created is running",
      };
    }

    // 2) POST = (on traitera l’envoi email après)
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Log complet pour contrôle
    console.log("Incoming POST", {
      headers: event.headers,
      body: event.body,
    });

    // parse JSON attendu { payload: { data: {...} } } comme Netlify Forms
    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      console.error("JSON parse error:", e);
      return { statusCode: 400, body: "Bad JSON" };
    }

    // Simule un traitement OK
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, received: payload }),
    };
  } catch (err) {
    console.error("UNHANDLED ERROR:", err.stack || err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
