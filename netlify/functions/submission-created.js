// netlify/functions/submission-created.js
exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { 'content-type': 'text/plain' },
    body: `OK ONLY GET - ${new Date().toISOString()} - METHOD:${event.httpMethod}`,
  };
};
