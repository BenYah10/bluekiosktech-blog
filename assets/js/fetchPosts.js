// assets/js/fetchPosts.js
import { groq, escapeHtml, fmtDate } from './sanityClient.js';

function html(strings, ...values) {
  return strings.reduce((acc, s, i) => acc + s + (values[i] ?? ''), '');
}

async function loadPosts() {
  const query = `
    *[_type=="post" && defined(slug.current)]
      | order(publishedAt desc)[0...50]{
        "id": _id,
        "title": coalesce(title, "Sans titre"),
        "slug": slug.current,
        "excerpt": excerpt,
        "date": publishedAt,
        // ~1300 chars ≈ 1 min de lecture
        "readTime": max(1, round(length(pt::text(body)) / 1300)),
        "category": category->title,
        "author": author->name
      }
  `;

  const { result = [] } = await groq(query);

  const $list = document.getElementById('posts-list');
  if (!$list) return;

  if (!result.length) {
    $list.innerHTML = '<p>Aucun article pour le moment.</p>';
    return;
  }

  $list.innerHTML = result
    .map(p => html`
      <article class="card">
        <h3>${escapeHtml(p.title)}</h3>
        <p class="meta">
          ${p.category ? escapeHtml(p.category) + ' · ' : ''}
          ${p.author ? escapeHtml(p.author) + ' · ' : ''}${fmtDate(p.date)} · ${p.readTime} min
        </p>
        ${p.excerpt ? `<p>${escapeHtml(p.excerpt)}</p>` : ''}
        <p><a href="post.html?id=${encodeURIComponent(p.slug)}">Lire →</a></p>
      </article>
    `)
    .join('');
}

document.addEventListener('DOMContentLoaded', loadPosts);
