// js/sanityClient.js
// Client minimal sans dépendance (GROQ via fetch)
export const SANITY_PROJECT_ID = 'fiq9yers';   // <= remplace par l'ID trouvé dans Sanity Manage
export const SANITY_DATASET    = 'production';
export const SANITY_API_VERSION = '2023-10-10';        // version stable de l'API

const BASE = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;

/** Exécute une requête GROQ côté navigateur (dataset public) */
export async function groq(query, params = {}) {
  const url = new URL(BASE);
  url.searchParams.set('query', query);
  if (params && Object.keys(params).length) {
    url.searchParams.set('params', JSON.stringify(params));
  }
  const res = await fetch(url.toString(), { credentials: 'omit' });
  if (!res.ok) throw new Error(`Sanity query failed (${res.status})`);
  const { result } = await res.json();
  return result;
}

/** Petit utilitaire pour échapper le HTML */
export function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/** Formate une date */
export function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return iso || ''; }
}
