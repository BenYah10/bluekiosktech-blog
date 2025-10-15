// assets/js/fetchPosts.js
import { groq } from './sanityClient.js';

/**
 * Récupère la liste des posts (résumés) depuis Sanity.
 * On ne filtre que les documents qui ont un slug défini,
 * et on trie du plus récent au plus ancien.
 */
export async function fetchPosts({ locale = 'fr' } = {}) {
  const query = `
*[_type == "post" && defined(slug.current)]
| order(_createdAt desc){
  _id,
  "slug": slug.current,
  title,
  excerpt,
  _createdAt
}`;

  // NOTE: on garde "locale" en param pour le futur si besoin
  const { result } = await groq(query, { locale });

  // Sanity renvoie {result: [...]}
  return Array.isArray(result) ? result : [];
}
