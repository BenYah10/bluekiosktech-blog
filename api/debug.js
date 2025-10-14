export default async function handler(request) {
  return new Response(JSON.stringify({
    clientId: process.env.OAUTH_GITHUB_CLIENT_ID ? '✅ Défini' : '❌ Manquant',
    clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET ? '✅ Défini' : '❌ Manquant',
    siteUrl: process.env.SITE_URL || 'Non défini',
    timestamp: new Date().toISOString()
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
