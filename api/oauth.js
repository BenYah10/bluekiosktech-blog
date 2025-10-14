// API OAuth GitHub pour BlueKioskTech - Version simplifiée
const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';

export default async function handler(request) {
  const url = new URL(request.url);
  
  try {
    const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
    const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;
    const siteUrl = process.env.SITE_URL || 'https://www.bluekiosktech.blog';

    // Vérification configuration
    if (!clientId || !clientSecret) {
      return new Response(
        `<!DOCTYPE html>
        <html><body>
          <h2>Erreur Configuration</h2>
          <p>Variables OAuth manquantes</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ error: 'Configuration OAuth manquante' }, '*');
              setTimeout(() => window.close(), 2000);
            }
          </script>
        </body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    // ÉTAPE 1: Redirection vers GitHub
    if (!code) {
      const state = Math.random().toString(36).substring(2);
      const redirectUrl = new URL(GITHUB_AUTHORIZE);
      
      redirectUrl.searchParams.set('client_id', clientId);
      redirectUrl.searchParams.set('redirect_uri', `${siteUrl}/api/oauth`);
      redirectUrl.searchParams.set('scope', 'repo,user');
      redirectUrl.searchParams.set('state', state);
      redirectUrl.searchParams.set('allow_signup', 'false');

      console.log('🔐 Redirection vers GitHub avec state:', state);
      
      const response = new Response(null, { status: 302 });
      response.headers.set('Location', redirectUrl.toString());
      response.headers.set('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`);
      
      return response;
    }

    // ÉTAPE 2: Échange du code contre token
    const tokenResponse = await fetch(GITHUB_TOKEN, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: `${siteUrl}/api/oauth`
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`GitHub API error: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('📦 Réponse token GitHub:', { 
      access_token: tokenData.access_token ? 'présent' : 'absent',
      scope: tokenData.scope 
    });

    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }

    // SUCCÈS - Retour du token
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Authentification réussie</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 40px; text-align: center; }
          .success { color: #28a745; font-size: 48px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="success">✓</div>
        <h2>Authentification réussie</h2>
        <p>Vous pouvez fermer cette fenêtre.</p>
        <script>
          (function() {
            const token = '${tokenData.access_token}';
            const userData = {
              token: token,
              provider: 'github'
            };
            
            // Stockage multiple pour compatibilité
            try {
              localStorage.setItem('decap-cms.user', JSON.stringify(userData));
              localStorage.setItem('netlify-cms.user', JSON.stringify(userData));
            } catch (e) {}
            
            // Communication avec la fenêtre parente
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                  type: 'oauth:success',
                  token: token,
                  provider: 'github'
                }, '*');
                
                setTimeout(() => window.close(), 500);
              } else {
                // Fallback: redirection
                setTimeout(() => {
                  window.location.href = '${siteUrl}/admin/';
                }, 1000);
              }
            } catch (error) {
              console.error('Error:', error);
              setTimeout(() => {
                window.location.href = '${siteUrl}/admin/';
              }, 1000);
            }
          })();
        </script>
      </body>
      </html>`,
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store'
        } 
      }
    );

  } catch (error) {
    console.error('OAuth Error:', error);
    
    return new Response(
      `<!DOCTYPE html>
      <html><body>
        <h2>Erreur d'authentification</h2>
        <p>${error.message}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ 
              error: 'Authentication failed: ${error.message}' 
            }, '*');
            setTimeout(() => window.close(), 3000);
          }
        </script>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
