// Liste les articles du dossier content/posts, parse le front-matter et renvoie un index JSON.
// Query params:
//   - locale=fr|en (optionnel; sinon tous)
//   - limit=number (optionnel)
//   - drafts=true pour inclure les brouillons (par défaut: ignorés)

const fg = require('fast-glob');
const fs = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');
const readingTime = require('reading-time');

function toISO(d) { try { return new Date(d).toISOString(); } catch { return null; } }

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const wantLocale = url.searchParams.get('locale');
    const includeDrafts = url.searchParams.get('drafts') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '0', 10);

    const pattern = 'content/posts/**/**/*.md';
    const files = await fg(pattern, { dot: false });

    const items = [];
    for (const file of files) {
      const rel = file.replace(/\\/g, '/');
      const parts = rel.split('/');
      // …/content/posts/<locale>/<year>/<month>/<slug>.md
      const locale = parts[2] || 'fr';

      if (wantLocale && wantLocale !== locale) continue;

      const raw = await fs.readFile(rel, 'utf8');
      const fm = matter(raw);
      const data = fm.data || {};

      if (!includeDrafts && data.draft === true) continue;

      const slug =
        (data.slug && String(data.slug)) ||
        path.basename(rel, '.md');

      const title = data.title || slug;
      const dateISO = toISO(data.date) || null;

      items.push({
        locale,
        slug,
        title,
        date: dateISO,
        excerpt: data.excerpt || '',
        cover: data.cover || null,
        cover_alt: data.cover_alt || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        author: data.author || null,
        reading_time: readingTime(fm.content).text,
        // URL par défaut vers ta page de lecture:
        url: `/post.html?locale=${encodeURIComponent(locale)}&slug=${encodeURIComponent(slug)}`
      });
    }

    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const out = (limit && limit > 0) ? items.slice(0, limit) : items;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).end(JSON.stringify({ count: out.length, items: out }));
  } catch (err) {
    console.error('posts-index error', err);
    return res.status(500).end('posts-index failed');
  }
};
