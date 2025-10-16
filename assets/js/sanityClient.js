// assets/js/sanityClient.js
// Client ultra-léger pour interroger l'API Sanity via GROQ.

/* ==== CONFIG ==== 
export const SANITY_PROJECT_ID = 'fiq9yers';     // <- ton Project ID
export const SANITY_DATASET    = 'production';   // <- dataset public
export const SANITY_API_VERSION = '2023-10-10';  // version d'API stable  */

/* ==== UTILS ==== 
export function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch {
    return '';
  }
}  */

/* ==== GROQ FETCH ==== 
function buildGroqUrl(query, params) {
  const base = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;
  const usp = new URLSearchParams();
  usp.set('query', query);
  if (params && Object.keys(params).length) {
    usp.set('params', JSON.stringify(params));
  }
  return `${base}?${usp.toString()}`;
}

/**
 * Appelle Sanity avec une requête GROQ.
 * @param {string} query - GROQ string (pas d’interpolation JS crue !)
 * @param {object} [params] - variables GROQ (ex: {slug:"..."}), encodées JSON
 * @returns {Promise<{result:any, ms?:number, query?:string}>}
 
 */
/*
export async function groq(query, params = {}) {
  const url = buildGroqUrl(query, params);

  // Log de debug très utile pendant les tests
  console.debug('[sanity] GET', url);

  const res = await fetch(url, {
    // pas de cookies -> CORS simple
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    headers: { 'Accept': 'application/json' }
  });

  let payload;
  try {
    payload = await res.json();
  } catch {
    throw new Error(`[sanity] HTTP ${res.status} — réponse illisible`);
  }

  // Sanity renvoie {statusCode, error, message} en cas d’erreur
  if (!res.ok || payload?.statusCode >= 400) {
    const msg = payload?.message || payload?.error || `HTTP ${res.status}`;
    console.error('[sanity] Query failed', { url, query, params, payload });
    throw new Error(`[sanity] ${msg}`);
  }

  return payload; // {query, result, ms, ...} 
   
} */
