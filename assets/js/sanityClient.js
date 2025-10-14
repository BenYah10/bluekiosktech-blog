// /assets/js/sanityClient.js
export const SANITY_PROJECT_ID  = 'fiq9vers';
export const SANITY_DATASET     = 'production';
export const SANITY_API_VERSION = '2023-10-10';

const BASE = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;

export async function groq(query, params = {}) {
  const url = new URL(BASE);
  url.searchParams.set('query', query);
  if (params && Object.keys(params).length) {
    url.searchParams.set('params', JSON.stringify(params));
  }

  // CORS public
  const res = await fetch(url.toString(), { mode: 'cors', credentials: 'omit' });

  let body = null;
  try { body = await res.json(); } catch (_) {}

  if (!res.ok) {
    console.error('Sanity query failed', res.status, body);
    throw new Error('Sanity query failed');
  }
  return body?.result;
}

// utilitaires déjà présents chez toi
export function escapeHtml(s=''){ return String(s).replace(/[&<>"]/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[m]); }
export function fmtDate(iso){ try{ return new Date(iso).toLocaleDateString('fr-FR',{ day:'2-digit', month:'short', year:'numeric'});}catch{ return '';} }

console.log('SANITY BASE =', BASE);
