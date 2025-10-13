// /api/oauth.js — GitHub OAuth pour Decap CMS (ESM, Node 18+)
// - Redirection vers GitHub (step 1) puis callback (step 2)
// - Vérifie le "state"
// - Échange "code" -> "access_token"
// - Renvoye un HTML qui :
//    - fait postMessage({ token, provider:'github' }, '*')
//    - fait postMessage('authorization:github:success:' + token, '*')
//    - écrit aussi localStorage 'decap-cms.user' et 'netlify-cms.user'
//    - fallback : si ouvert hors popup, redirige vers /admin/#/

const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';

const CFG = {
  clientId: process.env.OAUTH_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET || '',
  scopes: process.env.OAUTH_GITHUB_SCOPES || 'repo,user:email',
  jwtSecret: process.env.OAUTH_JWT_SECRET || 'change-me',
  siteUrl: process.env.SITE_URL || 'https://www.bluekiosktech.blog', // fige l’hôte
  cookieName: 'decap_state',
  cookieMaxAge: 10 * 60, // 10 min
};

function urlJoin(base, path) {
  if (!base.endsWith('/')) base += '/';
  return base + path.replace(/^\//, '');
}

function makeRedirectUri(req) {
  // On force l’hôte final via SITE_URL pour éviter les soucis apex/www
  const base = CFG.siteUrl.replace(/\/+$/, '');
  const u = new URL(urlJoin(base, req.url.split('?')[0]));
  u.searchParams.set('callback', '1');
  u.searchParams.set('provider', 'github');
  return u.toString();
}

function htmlSuccess(token) {
  const safe = String(token || '').replace(/</g, '&lt;');
  return `<!doctype html><meta charset="utf-8" />
<title>OAuth Success</title>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;padding:24px">
  <p>Authentification terminée. Vous pouvez fermer cette fenêtre.</p>
  <script>
  (function () {
    var token = '${safe}';
    var payload = JSON.stringify({ token: token, provider: 'github' });

    // Fallback : écrire ici aussi (si l'URL est ouverte directement)
    try {
      localStorage.setItem('decap-cms.user', payload);
      localStorage.setItem('netlify-cms.user', payload);
    } catch (e) {}

    try {
      if (window.opener && !window.opener.closed) {
        // Stockage dans la fenêtre parent
        try { window.opener.localStorage.setItem('decap-cms.user', payload); } catch(e){}
        try { window.opener.localStorage.setItem('netlify-cms.user', payload); } catch(e){}
        // postMessage (format objet + legacy)
        try { window.opener.postMessage({ token: token, provider: 'github' }, '*'); } catch(e){}
        try { window.opener.postMessage('authorization:github:success:' + token, '*'); } catch(e){}
        setTimeout(function(){ window.close(); }, 80);
        return;
      }
    } catch (e) {}

    // Si pas de window.opener (ouverture directe), revenir à l'admin
    setTimeout(function(){ window.location.replace('/admin/#/'); }, 200);
  })();
  </script>
</body>`;
}

function htmlError(msg) {
  const safe = String(msg || "OAuth error").replace(/</g, "&lt;");
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
        setTimeout(function(){ window.close(); }, 240);
      }
    } catch (e) { console.error(e); }
  })();
  </script>
</body>`;
}

function parseCookies(req) {
  const h = req.headers.cookie || '';
  return Object.fromEntries(h.split(/;\s*/).filter(Boolean).map(p => {
    const i = p.indexOf('=');
    if (i < 0) return [p.trim(), ''];
    return [decodeURIComponent(p.slice(0,i).trim()), decodeURIComponent(p.slice(i+1))];
  }));
}

function setCookie(res, name, val, maxAgeSec) {
  const parts = [
    name + '=' + encodeURIComponent(val),
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    // 'Secure', // décommente si tu es 100% en HTTPS, même en preview
  ];
  if (maxAgeSec) parts.push('Max-Age=' + maxAgeSec);
  res.setHeader('Set-Cookie', parts.join('; '));
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, CFG.siteUrl);
    const isCallback = url.searchParams.has('callback');
    const stateParam = url.searchParams.get('state');
    const cookies = parseCookies(req);

    if (!CFG.clientId || !CFG.clientSecret) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(htmlError('Missing GitHub OAuth env vars'));
    }

    if (!isCallback) {
      // Step 1: redirect to GitHub
      const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
      setCookie(res, CFG.cookieName, state, CFG.cookieMaxAge);
      const auth = new URL(GITHUB_AUTHORIZE);
      auth.searchParams.set('client_id', CFG.clientId);
      auth.searchParams.set('redirect_uri', makeRedirectUri(req));
      auth.searchParams.set('scope', CFG.scopes);
      auth.searchParams.set('state', state);
      res.statusCode = 302;
      res.setHeader('Location', auth.toString());
      return res.end();
    }

    // Step 2: callback
    const code = url.searchParams.get('code') || '';
    const stateCookie = cookies[CFG.cookieName] || '';
    if (!code) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(htmlError('Missing ?code'));
    }
    if (!stateParam || !stateCookie || stateParam !== stateCookie) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(htmlError('Invalid state'));
    }

    // Exchange code -> token
    const resp = await fetch(GITHUB_TOKEN, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CFG.clientId,
        client_secret: CFG.clientSecret,
        code,
        redirect_uri: makeRedirectUri(req),
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(htmlError('GitHub token exchange failed: ' + txt));
    }
    const tokenJson = await resp.json();
    if (!tokenJson.access_token) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(htmlError('No access_token in response'));
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(htmlSuccess(tokenJson.access_token));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(htmlError((e && (e.stack || e.message)) || 'Unhandled error'));
  }
}
