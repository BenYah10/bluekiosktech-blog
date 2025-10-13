// /api/oauth.js — GitHub OAuth pour Decap CMS (super-compat)
// - postMessage en 2 formats (objet + legacy string)
// - écrit aussi le token dans le localStorage de la fenêtre parente (2 clés)
// => même si l'event est perdu, l'admin retrouve la session au reload.

const crypto = require('crypto');

const CFG = {
  clientId: process.env.OAUTH_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET || '',
  jwtSecret: process.env.OAUTH_JWT_SECRET || 'change-me',
  scope: process.env.OAUTH_GITHUB_SCOPES || 'repo,user:email',
  siteUrl: process.env.SITE_URL || null, // ex: https://www.bluekiosktech.blog
};

function baseUrl(req) {
  if (CFG.siteUrl) return CFG.siteUrl.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return `${proto}://${host}`;
}

function hmac(s) { return crypto.createHmac('sha256', CFG.jwtSecret).update(s).digest('hex'); }
function makeState() {
  const raw = `${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
  const sig = hmac(raw);
  return `${raw}:${sig}`;
}
function checkState(state) {
  if (!state) return false;
  const parts = state.split(':'); // [ts, nonce, sig]
  if (parts.length !== 3) return false;
  const [ts, nonce, sig] = parts;
  const expect = hmac(`${ts}:${nonce}`);
  try { if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return false; }
  catch { return false; }
  return (Date.now() - Number(ts)) <= 10 * 60 * 1000; // 10 min
}

function htmlSuccess(token) {
  const safe = String(token).replace(/</g, '&lt;');
  return `<!doctype html><meta charset="utf-8" />
<title>Authenticated</title>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;padding:24px">
  <p>Authentication complete. You can close this window.</p>
  <script>
  (function () {
    var token = '${safe}';
    try {
      if (window.opener && !window.opener.closed) {
        // 1) Stockage local (fallback)
        try {
          var payload = JSON.stringify({ token: token, provider: 'github' });
          window.opener.localStorage.setItem('decap-cms.user', payload);
          window.opener.localStorage.setItem('netlify-cms.user', payload);
        } catch(e){ console.warn('localStorage set failed:', e); }

        // 2) Signaux postMessage (2 formats)
        try { window.opener.postMessage({ token: token, provider: 'github' }, '*'); } catch(e){}
        try { window.opener.postMessage('authorization:github:success:' + token, '*'); } catch(e){}

        setTimeout(function(){ window.close(); }, 80);
      } else {
        document.body.insertAdjacentHTML('beforeend','<p><strong>Token:</strong> ' + token + '</p>');
      }
    } catch (e) { console.error(e); }
  })();
  </script>
</body>`;
}

function htmlError(msg) {
  const safe = String(msg || 'OAuth error').replace(/</g, '&lt;');
  return `<!doctype html><meta charset="utf-8" />
<title>OAuth Error</title>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;padding:24px;color:#b00020">
  <h3>OAuth error</h3>
  <p>${safe}</p>
  <script>
  (function () {
    var msg = '${safe}';
    try {
      if (window.opener && !window.opener.closed) {
        try { window.opener.postMessage({ error: msg, provider: 'github' }, '*'); } catch(e){}
        try { window.opener.postMessage('authorization:github:error:' + msg, '*'); } catch(e){}
        setTimeout(function(){ window.close(); }, 120);
      }
    } catch (e) { console.error(e); }
  })();
  </script>
</body>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET,OPTIONS'); return res.status(405).end('Method Not Allowed'); }

  const url = new URL(req.url, baseUrl(req));
  const provider = url.searchParams.get('provider') || 'github';
  if (provider !== 'github') return res.status(400).end('Unsupported provider');

  const code = url.searchParams.get('code');
  if (!code) {
    if (!CFG.clientId || !CFG.clientSecret) return res.status(500).end('Missing GitHub OAuth env vars');
    const redirectUri = \`\${baseUrl(req)}/api/oauth?provider=github\`;
    const state = makeState();
    const authURL = new URL('https://github.com/login/oauth/authorize');
    authURL.searchParams.set('client_id', CFG.clientId);
    authURL.searchParams.set('redirect_uri', redirectUri);
    authURL.searchParams.set('scope', CFG.scope);
    authURL.searchParams.set('allow_signup', 'true');
    authURL.searchParams.set('state', state);
    res.writeHead(302, { Location: authURL.toString() });
    return res.end();
  }

  const state = url.searchParams.get('state');
  if (!checkState(state)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).end(htmlError('Invalid state'));
  }

  const redirectUri = \`\${baseUrl(req)}/api/oauth?provider=github\`;
  let tokenJson;
  try {
    const rsp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: CFG.clientId,
        client_secret: CFG.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    tokenJson = await rsp.json();
  } catch (e) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).end(htmlError(e.message || 'Token exchange failed'));
  }
  if (!tokenJson || !tokenJson.access_token) {
    const msg = (tokenJson && (tokenJson.error_description || tokenJson.error)) || 'No access_token received';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).end(htmlError(msg));
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).end(htmlSuccess(tokenJson.access_token));
};
