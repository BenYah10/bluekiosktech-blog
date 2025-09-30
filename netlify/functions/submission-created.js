// netlify/functions/submission-created.js
exports.handler = async (event) => {
  try {
    if (event.httpMethod === "GET") {
      return { statusCode: 200, headers: { "content-type": "text/plain" }, body: "OK - submission-created running" };
    }

    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // On loggue pour vérifier qu'on arrive ici
    console.log("POST body:", event.body);

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      console.error("JSON parse error:", e);
      return { statusCode: 400, body: "Bad JSON" };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, received: payload }),
    };
  } catch (err) {
    console.error("UNHANDLED ERROR:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
