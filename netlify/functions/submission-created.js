// netlify/functions/submission-created.js
exports.handler = async (event) => {
  // Logs très verbeux pour diagnostiquer
  console.log('METHOD:', event.httpMethod);
  console.log('HEADERS:', JSON.stringify(event.headers || {}));
  console.log('BODY:', event.body);

  // Réponse simple
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      // CORS permissif juste pour les tests
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify({ ok: true, received: !!event.body })
  };
};
