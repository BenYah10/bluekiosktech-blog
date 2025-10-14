// js/fetchPost.js
import { groq, escapeHtml, fmtDate } from './sanityClient.js';
import { toHTML } from 'https://esm.sh/@portabletext/to-html@2';

const params = new URLSearchParams(location.search);
const slug = params.get('slug');

const POST_QUERY = `
*[_type == "post" && slug.current == $slug][0]{
  title,
  "slug": slug.current,
  excerpt,
  "coverUrl": cover.asset->url,
  "author": author->{ name, "avatarUrl": avatar.asset->url },
  "categories": categories[]-> { title, "slug": slug.current },
  publishedAt,
  body
}
`;

(async () => {
  const $title = document.getElementById('post-title');
  const $meta  = document.getElementById('post-meta');
  const $cover = document.getElementById('post-cover');
  const $body  = document.getElementById('post-body');

  if (!$body) return;

  if (!slug) {
    $body.innerHTML = '<p>Slug manquant.</p>';
    return;
  }

  try {
    const post = await groq(POST_QUERY, { slug });
    if (!post) { $body.innerHTML = '<p>Article introuvable.</p>'; return; }

    if ($title) $title.textContent = post.title || '';
    if ($meta)  $meta.textContent  = `${fmtDate(post.publishedAt)}${post?.author?.name ? ` · ${post.author.name}` : ''}`;
    if ($cover && post.coverUrl) {
      $cover.innerHTML = `<img src="${post.coverUrl}?w=1200&fit=max&auto=format" alt="">`;
    }

    // Rendu "Portable Text" -> HTML (basique pour l’instant)
    const html = toHTML(post.body || []);
    $body.innerHTML = html;
  } catch (e) {
    $body.innerHTML = `<p style="color:#b00020">Erreur de chargement de l’article.</p>`;
    console.error(e);
  }
})();
