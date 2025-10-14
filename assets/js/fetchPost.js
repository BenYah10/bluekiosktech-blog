// /assets/js/fetchPost.js
import { groq, escapeHtml, fmtDate } from './sanityClient.js';
import { toHTML } from 'https://esm.sh/@portabletext/to-html@2';

function $(id){ return document.getElementById(id); }

// 1) Détection TRES tolérante du slug
const qs = new URLSearchParams(location.search);
let slug =
  qs.get('slug') ||
  qs.get('id') ||                // compat ancien schéma
  qs.get('post') ||              // au cas où
  qs.get('s') || '';

slug = decodeURIComponent(String(slug)).trim();

console.log('[post] href=', location.href);
console.log('[post] queryString=', qs.toString());
console.log('[post] slug=', slug);

// 2) Ne JAMAIS appeler Sanity si slug est vide → pas de 400
const $title = $('post-title');
const $meta  = $('post-meta');
const $cover = $('post-cover');
const $body  = $('post-body');

if (!$body) {
  console.warn('[post] #post-body introuvable');
} else if (!slug) {
  $body.innerHTML = '<p>Article introuvable (slug manquant).</p>';
} else {
  // 3) Requête GROQ
  const QUERY = `
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
    try {
      const post = await groq(QUERY, { slug });
      if (!post) {
        $body.innerHTML = '<p>Article introuvable.</p>';
        return;
      }

      if ($title) $title.textContent = post.title || '';
      if ($meta)  $meta.textContent  = `${fmtDate(post.publishedAt)}${post?.author?.name ? ` · ${escapeHtml(post.author.name)}` : ''}`;
      if ($cover && post.coverUrl) $cover.innerHTML = `<img src="${post.coverUrl}?w=1200&fit=max&auto=format" alt="">`;
      $body.innerHTML = toHTML(post.body || []);

      // SEO basique
      const url = `${location.origin}${location.pathname}?slug=${encodeURIComponent(post.slug)}`;
      document.title = post.title ? `${post.title} — BlueKioskTech` : 'Article — BlueKioskTech';
      const set = (sel, attr, val) => { const n = document.querySelector(sel); if (n) n.setAttribute(attr, val); };
      set('link[rel="canonical"]#canonicalLink','href',url);
      set('meta[name="description"]#postDescTag','content', post.excerpt || '');
      set('meta[property="og:title"]#ogTitle','content', document.title);
      set('meta[property="og:description"]#ogDesc','content', post.excerpt || '');
      set('meta[property="og:url"]#ogUrl','content', url);
      if (post.coverUrl) set('meta[property="og:image"]#ogImage','content', `${post.coverUrl}?w=1200&fit=max&auto=format`);
    } catch (e) {
      console.error(e);
      $body.innerHTML = '<p style="color:#b00020">Erreur de chargement de l’article.</p>';
    }
  })();
}
s
