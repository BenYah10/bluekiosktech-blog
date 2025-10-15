// /assets/js/fetchPosts.js
import { groq, escapeHtml, fmtDate } from './sanityClient.js';

/**
 * Rend une carte d’article
 */
function renderCard(p) {
  const cat = p.category ? ` — ${escapeHtml(p.category)}` : '';
  return `
    <article class="post-card">
      <h3><a href="post.html?slug=${encodeURIComponent(p.slug)}&lang=${encodeURIComponent(p.lang || 'fr')}">
        ${escapeHtml(p.title)}
      </a></h3>
      <p class="meta">
        ${fmtDate(p.date)} · ${p.readTime || 1} min${(p.readTime||1)>1?'s':''}${cat}
      </p>
      <p class="excerpt">${escapeHtml(p.excerpt || '')}</p>
      <p><a class="btn" href="post.html?slug=${encodeURIComponent(p.slug)}&lang=${encodeURIComponent(p.lang || 'fr')}">Lire →</a></p>
    </article>
  `;
}

/**
 * Charge et affiche la liste des articles
 */
(async function loadPosts() {
  // langue (compat avec ton site existant)
  const lang = (new URLSearchParams(location.search).get('locale')
             || new URLSearchParams(location.search).get('lang')
             || document.documentElement.lang
             || 'fr').slice(0,2).toLowerCase();

  // GROQ : aligne exactement avec tes schémas studio/post.js, category.js, author.js
  const query = `
    *[_type=="post" && defined(slug.current)]
      | order(publishedAt desc)[0...50]{
        "id": _id,
        "title": coalesce(title, "Sans titre"),
        "slug": slug.current,
        "excerpt": excerpt,
        "date": publishedAt,
        // lecture ≈ mots (pt::text) / 1300
        "readTime": max(1, round(length(pt::text(body)) / 1300)),
        "category": coalesce(categories[0]->title, ""),
        "author": author->name
      }
  `;

  try {
    const { result = [] } = await groq(query);

    // Point d’accroche existant dans ton HTML
    const $list = document.getElementById('posts-list');
    if (!$list) return;

    if (!result.length) {
      $list.innerHTML = '<p>Aucun article publié.</p>';
      return;
    }

    const html = result.map(p => renderCard({ ...p, lang })).join('');
    $list.innerHTML = html;

    // (optionnel) exposer au global pour un autre JS existant
    window.POSTS = result;
  } catch (e) {
    console.error('Erreur de chargement des articles:', e);
    const $list = document.getElementById('posts-list');
    if ($list) $list.innerHTML = '<p style="color:#b00020">Erreur de chargement des articles.</p>';
  }
})();
