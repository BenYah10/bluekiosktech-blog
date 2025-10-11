// /api/envcheck.js — quick runtime check for OAuth env vars
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    OAUTH_GITHUB_CLIENT_ID: Boolean(process.env.OAUTH_GITHUB_CLIENT_ID),
    OAUTH_GITHUB_CLIENT_SECRET: Boolean(process.env.OAUTH_GITHUB_CLIENT_SECRET),
    GITHUB_CLIENT_ID: Boolean(process.env.GITHUB_CLIENT_ID),
    GITHUB_CLIENT_SECRET: Boolean(process.env.GITHUB_CLIENT_SECRET),
    OAUTH_JWT_SECRET: Boolean(process.env.OAUTH_JWT_SECRET),
    NODE_ENV: process.env.NODE_ENV || null,
  });
}
