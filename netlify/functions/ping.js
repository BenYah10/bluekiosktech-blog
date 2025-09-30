// netlify/functions/ping.js
exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { 'content-type': 'text/plain' },
    body: `OK ${event.httpMethod} ${new Date().toISOString()}`,
  };
};
