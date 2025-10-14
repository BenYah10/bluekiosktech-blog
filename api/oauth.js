// API OAuth GitHub pour BlueKioskTech - Version stable
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
        <html>
        <body style="font-family: sans-serif; padding: 20px; text-align: center;">
          <h2>Erreur de Configuration</h2>
          <p>Variables d'environnement OAuth manquantes</p>
          <button onclick="window.close()">Fermer</button>
        </body>
        </html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    // ÉTAPE 1: Redirection vers GitHub
    if (!code) {
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const redirectUrl = new URL(GITHUB_AUTHORIZE);
      
      redirectUrl.searchParams.set('client_id', clientId);
      redirectUrl.searchParams.set('redirect_uri', `${siteUrl}/api/oauth`);
      redirectUrl.searchParams.set('scope', 'repo,user');
      redirectUrl.searchParams.set('state', state);

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

    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }

    // SUCCÈS - Retour du token
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Authentification réussie - BlueKioskTech</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            padding: 40px; 
            text-align: center; 
            background: #f5f5f5;
          }
          .success { 
            color: #28a745; 
            font-size: 48px; 
            margin-bottom: 20px; 
          }
          .box {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="success">✓</div>
          <h2>Authentification réussie</h2>
          <p>Vous pouvez fermer cette fenêtre.</p>
        </div>
        <script>
          (function() {
            const token = '${tokenData.access_token}';
            const userData = {
              token: token,
              provider: 'github',
              user: { login: 'admin' }
            };
            
            try {
              // Stockage pour Decap CMS
              localStorage.setItem('decap-cms.user', JSON.stringify(userData));
              console.log('Token stocké avec succès');
            } catch (e) {
              console.error('Erreur stockage:', e);
            }
            
            // Communication avec parent
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                  type: 'oauth:success',
                  token: token,
                  provider: 'github'
                }, '${siteUrl}');
                
                setTimeout(function() {
                  window.close();
                }, 500);
              } else {
                // Redirection fallback
                setTimeout(function() {
                  window.location.href = '${siteUrl}/admin/';
                }, 1000);
              }
            } catch (error) {
              console.error('Error:', error);
              setTimeout(function() {
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
        } 
      }
    );

  } catch (error) {
    console.error('OAuth Error:', error);
    
    return new Response(
      `<!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; padding: 20px; text-align: center;">
        <h2 style="color: #dc3545;">Erreur d'authentification</h2>
        <p>${error.message}</p>
        <button onclick="window.close()">Fermer</button>
        <script>
          try {
            if (window.opener) {
              window.opener.postMessage({ 
                error: 'Authentication failed' 
              }, '*');
            }
          } catch (e) {}
        </script>
      </body>
      </html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
