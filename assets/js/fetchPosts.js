// /assets/js/fetchPosts.js
import { groq, escapeHtml, fmtDate } from './sanityClient.js';

// ➜ Ce script doit tourner en mode "sanity". On NE fait rien en legacy.
(function () {
  if (window.FEED_SOURCE === 'legacy') return;

  // Conteneur de la grille d’articles (sur blog.html)
  const container = document.getElementById('posts');
  if (!container) return;

  const POSTS_QUERY = `
*[_type == "post"] | order(publishedAt desc) {
  _id,
  title,
  "slug": slug.current,
  excerpt,
  "coverUrl": cover.asset->url,
  "author": author->name,
  publishedAt
}[0...20]
`;

  (async () => {
    try {
      const posts = await groq(POSTS_QUERY);

      container.innerHTML = (posts || []).map(p => `
        <article class="post-card">
          ${p.coverUrl ? `<a href="/post.html?slug=${encodeURIComponent(p.slug)}">
            <img src="${p.coverUrl}?w=800&h=450&fit=crop&auto=format" alt=""></a>` : ''}
          <h2 class="post-title">
            <a href="/post.html?slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.title || '')}</a>
          </h2>
          <p class="post-meta">${fmtDate(p.publishedAt)}${p.author ? ` · ${escapeHtml(p.author)}` : ''}</p>
          ${p.excerpt ? `<p class="post-excerpt">${escapeHtml(p.excerpt)}</p>` : ''}
        </article>
      `).join('') || '<p>Aucun article pour le moment.</p>';
    } catch (e) {
      console.error('[posts] erreur:', e);
      container.innerHTML = `<p style="color:#b00020">Erreur de chargement des articles.</p>`;
    }
  })();
})();
