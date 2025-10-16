// assets/js/fetchPost.js
import { groq, escapeHtml, fmtDate } from './sanityClient.js';

function getSlug() {
  const url = new URL(location.href);
  return url.searchParams.get('id') || url.searchParams.get('slug');
}

function renderPortableText(blocks = []) {
  // Rendu minimaliste du Portable Text (paragraphe uniquement)
  return blocks
    .map(b => (b._type === 'block' ? `<p>${escapeHtml(b.children?.map(c => c.text).join('') || '')}</p>` : ''))
    .join('');
}

async function loadPost() {
  const slug = getSlug();
  if (!slug) return;

  const query = `
    *[_type=="post" && slug.current==$slug][0]{
      "id": _id,
      "title": title,
      "slug": slug.current,
      "excerpt": excerpt,
      "date": publishedAt,
      "readTime": max(1, round(length(pt::text(body)) / 1300)),
      "category": category->title,
      "author": author->name,
      "coverUrl": coalesce(cover.asset->url, ""),
      body
    }
  `;

  const { result: post } = await groq(query, { slug });
  if (!post) {
    document.getElementById('post-body')?.insertAdjacentHTML('beforeend', '<p>Article introuvable.</p>');
    return;
  }

  // Remplissage du DOM
  const $title = document.getElementById('post-title');
  const $meta  = document.getElementById('post-meta');
  const $body  = document.getElementById('post-body');
  const $cover = document.getElementById('post-cover');

  if ($title) $title.textContent = post.title || 'Sans titre';
  if ($meta) {
    const parts = [];
    if (post.category) parts.push(escapeHtml(post.category));
    if (post.author)   parts.push(escapeHtml(post.author));
    parts.push(`${fmtDate(post.date)} · ${post.readTime} min`);
    $meta.textContent = parts.join(' · ');
  }
  if ($cover && post.coverUrl) {
    $cover.src = post.coverUrl;
    $cover.alt = post.title || '';
  }
  if ($body) $body.innerHTML = renderPortableText(post.body);
}

document.addEventListener('DOMContentLoaded', loadPost);
