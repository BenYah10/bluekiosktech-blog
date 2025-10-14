// ==================================================
// 🔐 API OAuth GitHub pour BlueKioskTech Blog
// ==================================================

const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';

// Configuration sécurisée
const CONFIG = {
  clientId: process.env.OAUTH_GITHUB_CLIENT_ID,
  clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
  scopes: 'repo,user', // Scopes nécessaires pour Decap CMS
  siteUrl: process.env.SITE_URL || 'https://www.bluekiosktech.blog',
  cookieName: 'gh_oauth_state',
  cookieMaxAge: 10 * 60, // 10 minutes
};

// ==================================================
// 🛠️ UTILITAIRES
// ==================================================

function generateState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

function parseCookies(request) {
  const cookies = {};
  const cookieHeader = request.headers.get('cookie');
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = decodeURIComponent(value);
    });
  }
  
  return cookies;
}

function setCookie(response, name, value, maxAge) {
  const cookie = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure', // Important pour la production
    `Max-Age=${maxAge}`
  ].join('; ');
  
  response.headers.append('Set-Cookie', cookie);
}

// ==================================================
// 📨 RÉPONSES HTML
// ==================================================

function htmlSuccess(token) {
  const safeToken = String(token).replace(/</g, '&lt;').replace(/'/g, '&#39;');
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authentification réussie - BlueKioskTech</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .success-box {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 500px;
    }
    .checkmark {
      color: #28a745;
      font-size: 48px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="success-box">
    <div class="checkmark">✓</div>
    <h2>Authentification réussie</h2>
    <p>Vous pouvez maintenant fermer cette fenêtre et retourner à l'administration.</p>
    <script>
      (function() {
        const token = '${safeToken}';
        const payload = JSON.stringify({ 
          token: token, 
          provider: 'github',
          expires: Date.now() + (8 * 60 * 60 * 1000) // 8 heures
        });
        
        // Stockage sécurisé
        const storeToken = () => {
          try {
            localStorage.setItem('decap-cms.user', payload);
            localStorage.setItem('netlify-cms.user', payload);
            console.log('✅ Token stocké avec succès');
          } catch (e) {
            console.error('❌ Erreur stockage:', e);
          }
        };
        
        // Communication avec la fenêtre parente
        try {
          if (window.opener && !window.opener.closed) {
            // Stockage dans le parent
            try {
              window.opener.localStorage.setItem('decap-cms.user', payload);
              window.opener.localStorage.setItem('netlify-cms.user', payload);
            } catch (e) {}
            
            // Messages de succès
            window.opener.postMessage({ 
              type: 'oauth:success',
              provider: 'github',
              token: token 
            }, '${CONFIG.siteUrl}');
            
            window.opener.postMessage('authorization:github:success:' + token, '${CONFIG.siteUrl}');
            
            // Fermeture automatique
            setTimeout(() => window.close(), 500);
          } else {
            // Fallback: redirection vers l'admin
            storeToken();
            setTimeout(() => {
              window.location.href = '${CONFIG.siteUrl}/admin/#/';
            }, 1000);
          }
        } catch (error) {
          // Fallback ultime
          storeToken();
          setTimeout(() => {
            window.location.href = '${CONFIG.siteUrl}/admin/#/';
          }, 1500);
        }
      })();
    </script>
  </div>
</body>
</html>`;
}

function htmlError(message, details = '') {
  const safeMessage = String(message).replace(/</g, '&lt;');
  const safeDetails = String(details).replace(/</g, '&lt;');
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Erreur d'authentification - BlueKioskTech</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .error-box {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 500px;
      border-left: 4px solid #dc3545;
    }
    .error-icon {
      color: #dc3545;
      font-size: 48px;
      margin-bottom: 20px;
    }
    .details {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin-top: 20px;
      font-family: monospace;
      font-size: 12px;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="error-box">
    <div class="error-icon">❌</div>
    <h2>Erreur d'authentification</h2>
    <p>${safeMessage}</p>
    ${safeDetails ? `<div class="details">${safeDetails}</div>` : ''}
    <script>
      (function() {
        const errorMsg = '${safeMessage}';
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
              type: 'oauth:error',
              provider: 'github',
              error: errorMsg
            }, '*');
            setTimeout(() => window.close(), 3000);
          }
        } catch (e) {
          console.error('Error communication:', e);
        }
      })();
    </script>
  </div>
</body>
</html>`;
}

// ==================================================
// 🚀 HANDLER PRINCIPAL
// ==================================================

export default async function handler(request) {
  try {
    // Vérification de la configuration
    if (!CONFIG.clientId || !CONFIG.clientSecret) {
      return new Response(
        htmlError('Configuration OAuth manquante', 'Vérifiez les variables d\'environnement'),
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const url = new URL(request.url, CONFIG.siteUrl);
    const isCallback = url.searchParams.has('code');
    const cookies = parseCookies(request);

    // ==================================================
    // ÉTAPE 1: REDIRECTION VERS GITHUB
    // ==================================================
    if (!isCallback) {
      const state = generateState();
      const redirectUri = new URL(GITHUB_AUTHORIZE);
      
      redirectUri.searchParams.set('client_id', CONFIG.clientId);
      redirectUri.searchParams.set('redirect_uri', `${CONFIG.siteUrl}/api/oauth`);
      redirectUri.searchParams.set('scope', CONFIG.scopes);
      redirectUri.searchParams.set('state', state);
      redirectUri.searchParams.set('allow_signup', 'false');

      const response = new Response(null, { status: 302 });
      setCookie(response, CONFIG.cookieName, state, CONFIG.cookieMaxAge);
      response.headers.set('Location', redirectUri.toString());
      
      return response;
    }

    // ==================================================
    // ÉTAPE 2: CALLBACK GITHUB
    // ==================================================
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const storedState = cookies[CONFIG.cookieName];

    // Validation du state
    if (!state || !storedState || state !== storedState) {
      return new Response(
        htmlError('State invalide ou expiré', 'Veuillez réessayer'),
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    if (!code) {
      return new Response(
        htmlError('Code d\'autorisation manquant'),
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // ==================================================
    // ÉCHANGE DU CODE CONTRE LE TOKEN
    // ==================================================
    const tokenResponse = await fetch(GITHUB_TOKEN, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'BlueKioskTech-Blog'
      },
      body: JSON.stringify({
        client_id: CONFIG.clientId,
        client_secret: CONFIG.clientSecret,
        code: code,
        redirect_uri: `${CONFIG.siteUrl}/api/oauth`
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return new Response(
        htmlError('Échec de l\'échange du token GitHub', errorText),
        { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return new Response(
        htmlError('Token d\'accès manquant dans la réponse', JSON.stringify(tokenData)),
        { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // ==================================================
    // SUCCÈS - RETOUR DU TOKEN
    // ==================================================
    return new Response(
      htmlSuccess(tokenData.access_token),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        } 
      }
    );

  } catch (error) {
    // Gestion centralisée des erreurs
    console.error('❌ Erreur OAuth:', error);
    
    return new Response(
      htmlError('Erreur interne du serveur', error.message),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
