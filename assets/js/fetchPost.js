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

function setHeadMeta(post) {
  const url = `${location.origin}${location.pathname}?slug=${encodeURIComponent(post.slug)}`;
  const title = `${post.title || 'Article'} — BlueKioskTech`;
  const desc = post.excerpt || '';

  const Q = (id) => document.getElementById(id);
  Q('postTitleTag') && (Q('postTitleTag').textContent = title);
  Q('postDescTag') && Q('postDescTag').setAttribute('content', desc);
  Q('canonicalLink') && Q('canonicalLink').setAttribute('href', url);
  Q('altFr') && Q('altFr').setAttribute('href', url);
  Q('altEn') && Q('altEn').setAttribute('href', url);
  Q('altX') && Q('altX').setAttribute('href', url);
  Q('ogTitle') && Q('ogTitle').setAttribute('content', title);
  Q('ogDesc') && Q('ogDesc').setAttribute('content', desc);
  Q('ogUrl') && Q('ogUrl').setAttribute('content', url);
  if (post.coverUrl) Q('ogImage') && Q('ogImage').setAttribute('content', `${post.coverUrl}?w=1200&fit=max&auto=format`);

  // JSON-LD BlogPosting minimal
  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title || "Article",
    "image": post.coverUrl ? [`${post.coverUrl}?w=1200&fit=max&auto=format`] : undefined,
    "datePublished": post.publishedAt,
    "dateModified": post.publishedAt,
    "author": { "@type": "Organization", "name": "BlueKioskTech" },
    "mainEntityOfPage": { "@type": "WebPage", "@id": url }
  };
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.text = JSON.stringify(ld);
  document.head.appendChild(s);
}

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

    // Remplir le contenu
    if ($title) $title.textContent = post.title || '';
    if ($meta)  $meta.textContent  = `${fmtDate(post.publishedAt)}${post?.author?.name ? ` · ${escapeHtml(post.author.name)}` : ''}`;
    if ($cover && post.coverUrl) {
      $cover.innerHTML = `<img src="${post.coverUrl}?w=1200&fit=max&auto=format" alt="">`;
    }
    $body.innerHTML = toHTML(post.body || []);

    // Mettre à jour le <head> (title / meta / og / canonical)
    setHeadMeta(post);
  } catch (e) {
    $body.innerHTML = `<p style="color:#b00020">Erreur de chargement de l’article.</p>`;
    console.error(e);
  }
})();
