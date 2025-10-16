// /assets/js/sanityClient.js
// Client léger pour Sanity (GROQ via fetch)

export const SANITY_PROJECT_ID  = 'fiq9yers';     // <- ton Project ID
export const SANITY_DATASET     = 'production';   // <- dataset public choisi
export const SANITY_API_VERSION = '2023-10-10';   // version stable de l’API

const BASE = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;
const DEBUG = false; // passe à true si tu veux voir les logs des requêtes

/**
 * Appelle l’API data/query de Sanity.
 * @param {string} query - requête GROQ
 * @param {object} [params] - variables GROQ
 * @returns {Promise<any>}
 */
export async function groq(query, params = {}) {
  const url = new URL(BASE);
  url.searchParams.set('query', query);
  if (params && Object.keys(params).length) {
    // IMPORTANT: Sanity attend un JSON encodé dans "params"
    url.searchParams.set('params', JSON.stringify(params));
  }

  if (DEBUG) {
    console.log('[sanity] BASE =', BASE);
    console.log('[GROQ]', query, params);
  }

  // Pas de cookies -> pas besoin d’autoriser les credentials côté CORS
  const res = await fetch(url.toString(), { mode: 'cors', credentials: 'omit' });

  // On tente toujours de décoder le JSON pour loguer proprement les erreurs
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('[sanity] HTTP', res.status, json);
    throw new Error(`Sanity query failed (${res.status})`);
  }

  // Sanity renvoie {result: ...}
  return json.result ?? null;
}

// Petits utilitaires UI
export function escapeHtml(s = '') {
  return String(s)
    .replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
}

export function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  } catch {
    return '';
  }
}
