// netlify/functions/submission-created.js
'use strict';

module.exports.handler = async (event) => {
  try {
    // 1) ping santé
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: 'OK - submission-created is running',
      };
    }

    // 2) on n’accepte que POST sinon 405
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 3) parse JSON
    let payload = {};
    try {
      payload = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, body: 'Bad JSON' };
    }

    // 4) renvoi simple (pas d’email pour l’instant)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, received: payload }),
    };
  } catch (err) {
    // si plantage inattendu
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
