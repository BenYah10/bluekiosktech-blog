// /api/oauth.js – OAuth GitHub pour Decap CMS (Vercel Functions, Node 18+)
// Flux complet :
//  - GET /api/oauth?provider=github            -> redirige vers GitHub (avec state signé)
//  - GET /api/oauth?provider=github&code=...   -> échange le code -> renvoie une page
//       qui fait window.opener.postMessage({token}, '*') puis window.close()

const jwt = require('crypto'); // on l'utilise pour signer/valider le "state" (HMAC)
const APP = {
  clientId: process.env.OAUTH_GITHUB_CLIENT_ID,
  clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
  jwtSecret: process.env.OAUTH_JWT_SECRET || 'change-me',
  scope: process.env.OAUTH_GITHUB_SCOPES || 'repo,user:email'
};

// Utilitaires
function baseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host  = (req.headers['x-forwarded-host']  || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}`;
}
function hmacSign(payload) {
  return jwt.createHmac('sha256', APP.jwtSecret).update(payload).digest('hex');
}
function makeState() {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${nonce}.${hmacSign(nonce)}`;
}
function checkState(state) {
  if (!state || !state.includes('.')) return false;
  const [nonce, sig] = state.split('.');
  return hmacSign(nonce) === sig;
}
function htmlError(msg) {
  return `<!doctype html><meta charset="utf-8"><title>OAuth error</title>
  <pre style="font:14px/1.4 system-ui,Segoe UI,Roboto,Arial;padding:16px">OAuth error: ${msg}</pre>`;
}
function htmlSuccess(token) {
  // Cette page renvoie le token à la fenêtre /admin via postMessage
  const safe = token.replace(/</g, '&lt;');
  return `<!doctype html><meta charset="utf-8"><title>OAuth</title>
<script>
  (function(){
    try {
      if (window.opener) {
        window.opener.postMessage({ token: "${safe}", provider: "github" }, "*");
        window.close();
      } else {
        document.body.innerHTML = "<pre style='font:14px/1.4 system-ui,Segoe UI,Roboto,Arial;padding:16px'>Token: ${safe}</pre>";
      }
    } catch(e) {
      document.body.innerHTML = "<pre style='font:14px/1.4 system-ui,Segoe UI,Roboto,Arial;padding:16px'>Token: ${safe}</pre>";
    }
  })();
</script>`;
}

module.exports = async (req, res) => {
  try {
    // CORS minimal (utile si /admin est servi depuis un autre sous-domaine)
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

    // 1) Démarrage : redirige vers GitHub
    const code = url.searchParams.get('code');
    if (!code) {
      if (!APP.clientId || !APP.clientSecret) {
        return res.status(500).end('Missing GitHub OAuth env vars');
      }
      const state = makeState();
      const redirectUri = `${baseUrl(req)}/api/oauth?provider=github`;
      const authURL = new URL('https://github.com/login/oauth/authorize');
      authURL.searchParams.set('client_id', APP.clientId);
      authURL.searchParams.set('redirect_uri', redirectUri);
      authURL.searchParams.set('scope', APP.scope);
      authURL.searchParams.set('allow_signup', 'true');
      authURL.searchParams.set('state', state);
      res.statusCode = 302;
      res.setHeader('Location', authURL.toString());
      return res.end();
    }

    // 2) Retour GitHub : on valide le state, puis on échange le code
    const state = url.searchParams.get('state');
    if (!checkState(state)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(htmlError('Invalid state'));
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: APP.clientId,
        client_secret: APP.clientSecret,
        code,
        redirect_uri: `${baseUrl(req)}/api/oauth?provider=github`
      })
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || tokenJson.error || !tokenJson.access_token) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(htmlError(`Token exchange failed: ${JSON.stringify(tokenJson)}`));
    }

    // 3) Renvoie le token à Decap via postMessage
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(htmlSuccess(tokenJson.access_token));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(htmlError(e && e.message ? e.message : String(e)));
  }
};
