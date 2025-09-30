// netlify/functions/submission-created.cjs
'use strict';

module.exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      return { statusCode: 200, headers: { 'Content-Type': 'text/plain' }, body: 'OK - submission-created is running' };
    }
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // On teste un JSON très simple
    let payload = {};
    try { payload = JSON.parse(event.body || '{}'); } catch {
      return { statusCode: 400, body: 'Bad JSON' };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, received: payload }),
    };
  } catch (err) {
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
