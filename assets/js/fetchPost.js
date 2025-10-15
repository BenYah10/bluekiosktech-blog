// assets/js/fetchPost.js
import { groq } from './sanityClient.js';

/**
 * Récupère un post par son slug (ex: "immunite-collective-hygiene").
 * IMPORTANT: on compare "slug.current" au param $slug (pas $slug.current).
 */
export async function fetchPost({ slug, locale = 'fr' }) {
  if (!slug || typeof slug !== 'string') {
    throw new Error('fetchPost: "slug" (string) est requis');
  }

  const query = `
*[_type == "post" && slug.current == $slug][0]{
  _id,
  "slug": slug.current,
  title,
  excerpt,
  body,
  _createdAt
}`;

  const { result } = await groq(query, { slug, locale });

  return result || null;
}
