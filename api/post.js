// Renvoie un article (front-matter + HTML) à partir du slug et de la locale.
// Query params:
//   - locale=fr|en (default=fr)
//   - slug=mon-article (obligatoire)

const fg = require('fast-glob');
const fs = require('fs/promises');
const matter = require('gray-matter');
const { marked } = require('marked');
const readingTime = require('reading-time');

marked.setOptions({
  headerIds: true,
  mangle: false
});

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const locale = (url.searchParams.get('locale') || 'fr').toLowerCase();
    const slug = url.searchParams.get('slug');

    if (!slug) return res.status(400).end('Missing slug');

    // Cherche les fichiers correspondant à la locale
    const files = await fg(`content/posts/${locale}/**/*.md`);
    let matchPath = null, parsed = null;

    for (const file of files) {
      const raw = await fs.readFile(file, 'utf8');
      const fm = matter(raw);
      const data = fm.data || {};
      const fileSlug = data.slug || file.split('/').pop().replace(/\.md$/, '');
      if (fileSlug === slug) {
        matchPath = file;
        parsed = { data, content: fm.content };
        break;
      }
    }

    if (!matchPath || !parsed) return res.status(404).end('Not found');

    if (parsed.data.draft === true) {
      // Par défaut on ne renvoie pas les brouillons
      return res.status(403).end('Draft');
    }

    const html = marked.parse(parsed.content || '');
    const meta = {
      locale,
      slug,
      title: parsed.data.title || slug,
      date: parsed.data.date || null,
      excerpt: parsed.data.excerpt || '',
      cover: parsed.data.cover || null,
      cover_alt: parsed.data.cover_alt || '',
      tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
      author: parsed.data.author || null,
      seo: parsed.data.seo || {},
      reading_time: readingTime(parsed.content || '').text
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).end(JSON.stringify({ meta, html }));
  } catch (err) {
    console.error('post error', err);
    return res.status(500).end('post failed');
  }
};
