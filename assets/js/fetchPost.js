// /assets/js/fetchPost.js
import { groq, escapeHtml, fmtDate } from './sanityClient.js';
import { toHTML } from 'https://esm.sh/@portabletext/to-html@2';

function $(id){ return document.getElementById(id); }

// Récup du slug avec pas mal de tolérance (compat ancien code)
const qs = new URLSearchParams(location.search);
let slug =
  qs.get('slug') ||
  qs.get('id') ||            // compat ancien param
  qs.get('post') ||
  qs.get('s') || '';
slug = decodeURIComponent(String(slug)).trim();

(async function loadPost() {
  const $title = $('post-title');
  const $meta  = $('post-meta');
  const $body  = $('post-body');

  if (!slug) {
    if ($title) $title.textContent = 'Slug manquant.';
    if ($body)  $body.innerHTML = '<p>Impossible d’identifier l’article.</p>';
    return;
  }

  // 1) Charger l’article par son slug
  const postQuery = `
    *[_type=="post" && slug.current==$slug][0]{
      "id": _id,
      "title": coalesce(title, "Sans titre"),
      "slug": slug.current,
      "excerpt": excerpt,
      "date": publishedAt,
      "readTime": max(1, round(length(pt::text(body)) / 1300)),
      "category": coalesce(categories[0]->title, ""),
      "author": author->name,
      "coverUrl": cover.asset->url,
      "body": body
    }
  `;
  const params = { slug };

  try {
    const { result: post } = await groq(postQuery, params);
    if (!post) throw new Error('Article introuvable pour ce slug');

    // 2) Rendu
    if ($title) $title.textContent = post.title;
    if ($meta) {
      const bits = [
        post.author ? `par ${escapeHtml(post.author)}` : '',
        post.date   ? fmtDate(post.date) : '',
        `${post.readTime} min`
      ].filter(Boolean);
      $meta.textContent = bits.join(' · ');
    }

    if ($body) {
      // portable text -> HTML sécurisé (respecte les types autorisés de ton schema)
      const html = toHTML(post.body || []);
      $body.innerHTML = html;

      // ancre éventuelle au hash (#…) après rendu
      if (location.hash) {
        const el = document.getElementById(location.hash.slice(1));
        if (el) el.scrollIntoView({behavior:'smooth'});
      }
    }

    // 3) (Optionnel) MAJ SEO de base si tu as déjà ces balises avec des id
    const url = location.href.split('#')[0];
    const set = (sel, attr, val) => {
      const n = document.querySelector(sel);
      if (n) n.setAttribute(attr, val);
    };
    document.title = post.title ? `${post.title} — BlueKioskTech` : 'Article — BlueKioskTech';
    set('link[rel="canonical"]#canonicalLink','href',url);
    set('meta[name="description"]#postDescTag','content', post.excerpt || '');
    set('meta[property="og:title"]#ogTitle','content', document.title);
    set('meta[property="og:description"]#ogDesc','content', post.excerpt || '');
    set('meta[property="og:url"]#ogUrl','content', url);
    if (post.coverUrl) {
      set('meta[property="og:image"]#ogImage','content', `${post.coverUrl}?w=1200&fit=max&auto=format`);
    }
  } catch (e) {
    console.error(e);
    if ($title) $title.textContent = 'Erreur de chargement de l’article';
    if ($body)  $body.innerHTML = '<p style="color:#b00020">Erreur de chargement de l’article.</p>';
  }
})();
