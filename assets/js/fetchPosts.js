// js/fetchPosts.js
import { groq, escapeHtml, fmtDate } from './sanityClient.js';

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
  const container = document.getElementById('posts');
  if (!container) return;

  try {
    const posts = await groq(POSTS_QUERY);
    container.innerHTML = posts.map(p => `
      <article class="post-card">
        ${p.coverUrl ? `<a href="/post.html?slug=${encodeURIComponent(p.slug)}">
          <img src="${p.coverUrl}?w=800&h=450&fit=crop&auto=format" alt=""></a>` : ''}
        <h2 class="post-title">
          <a href="/post.html?slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a>
        </h2>
        <p class="post-meta">${fmtDate(p.publishedAt)}${p.author ? ` · ${escapeHtml(p.author)}` : ''}</p>
        ${p.excerpt ? `<p class="post-excerpt">${escapeHtml(p.excerpt)}</p>` : ''}
      </article>
    `).join('') || '<p>Aucun article pour le moment.</p>';
  } catch (e) {
    container.innerHTML = `<p style="color:#b00020">Erreur de chargement des articles.</p>`;
    console.error(e);
  }
})();
