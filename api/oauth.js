// /api/oauth.js — GitHub OAuth for Decap CMS (Vercel Serverless, Node 18+)
// Compatible Decap: envoie à la popup *deux* formats postMessage :
//   1) objet { token, provider: 'github' }
//   2) string "authorization:github:success:<token>" (legacy)
// => évite que la popup reste ouverte après "Authorize".

const crypto = require('crypto');

// ---- Config depuis ENV (avec fallback sur anciens noms) ---------------------
const CFG = {
  clientId:
    process.env.OAUTH_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || '',
  clientSecret:
    process.env.OAUTH_GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET || '',
  jwtSecret: process.env.OAUTH_JWT_SECRET || 'change-me',
  scope: process.env.OAUTH_GITHUB_SCOPES || 'repo,user:email',
  // Si tu veux forcer le domaine (ex: prod), définis SITE_URL = https://www.bluekiosktech.blog
  siteUrl: process.env.SITE_URL || null,
};

// ---- Helpers ----------------------------------------------------------------
function baseUrl(req) {
  if (CFG.siteUrl) return CFG.siteUrl.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return `${proto}://${host}`;
}

function hmac(s) {
  return crypto.createHmac('sha256', CFG.jwtSecret).update(s).digest('hex');
}
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
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return false;
  } catch {
    return false;
  }
  // valide 10 minutes
  if (Date.now() - Number(ts) > 10 * 60 * 1000) return false;
  return true;
}

function htmlSuccess(token) {
  const safe = String(token).replace(/</g, '&lt;');
  return `<!doctype html><meta charset="utf-8" />
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;padding:24px}</style>
<title>Authenticated</title>
<body>
  <p>Authentication complete. You can close this window.</p>
  <script>
  (function () {
    var token = '${safe}';
    try {
      if (window.opener && !window.opener.closed) {
        // Format objet (Decap moderne)
        window.opener.postMessage({ token: token, provider: 'github' }, '*');
        // Format string (legacy)
        window.opener.postMessage('authorization:github:success:' + token, '*');
        setTimeout(function(){ window.close(); }, 80);
      } else {
        document.body.insertAdjacentHTML('beforeend',
          '<p><strong>Token:</strong> ' + token + '</p>');
      }
    } catch (e) {
      console.error(e);
    }
  })();
  </script>
</body>`;
}

function htmlError(msg) {
  const safe = String(msg || 'OAuth error').replace(/</g, '&lt;');
  return `<!doctype html><meta charset="utf-8" />
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;padding:24px;color:#b00020}</style>
<title>OAuth Error</title>
<body>
  <h3>OAuth error</h3>
  <p>${safe}</p>
  <script>
  (function () {
    var msg = '${safe}';
    try {
      if (window.opener && !window.opener.closed) {
        // Format objet
        window.opener.postMessage({ error: msg, provider: 'github' }, '*');
        // Format string (legacy)
        window.opener.postMessage('authorization:github:error:' + msg, '*');
        setTimeout(function(){ window.close(); }, 120);
      }
    } catch (e) { console.error(e); }
  })();
  </script>
</body>`;
}

// ---- Handler ----------------------------------------------------------------
module.exports = async function handler(req, res) {
  // CORS minimal pour la popup
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET,OPTIONS');
    return res.status(405).end('Method Not Allowed');
  }

  const url = new URL(req.url, baseUrl(req));
  const provider = url.searchParams.get('provider') || 'github';
  if (provider !== 'github') return res.status(400).end('Unsupported provider');

  // 1) Démarrage → on redirige vers GitHub
  const code = url.searchParams.get('code');
  if (!code) {
    if (!CFG.clientId || !CFG.clientSecret) {
      return res.status(500).end('Missing GitHub OAuth env vars');
    }
    const redirectUri = `${baseUrl(req)}/api/oauth?provider=github`;
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

  // 2) Retour GitHub → on vérifie le state puis on échange le code
  const state = url.searchParams.get('state');
  if (!checkState(state)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).end(htmlError('Invalid state'));
  }

  const redirectUri = `${baseUrl(req)}/api/oauth?provider=github`;
  const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
    body: new URLSearchParams({
      client_id: CFG.clientId,
      client_secret: CFG.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  }).catch((e) => ({ ok:false, json: async ()=>({ error_description: e.message }) }));

  const tokenJson = tokenResp && tokenResp.ok ? await tokenResp.json() : (await tokenResp.json());
  if (!tokenJson || !tokenJson.access_token) {
    const msg = (tokenJson && (tokenJson.error_description || tokenJson.error)) || 'No access_token received';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).end(htmlError(msg));
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).end(htmlSuccess(tokenJson.access_token));
};
