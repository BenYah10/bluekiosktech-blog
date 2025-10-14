// Branche la liste sur blog.html (div#posts-list) et la lecture sur post.html (article#post-content)
;(function () {
  if (typeof window !== 'undefined' && window.FEED_SOURCE && window.FEED_SOURCE !== 'legacy') {
    console.info('[cms-posts] neutralisé sur cette page (FEED_SOURCE=', window.FEED_SOURCE, ')');
    return; // ↩️ stoppe l'exécution du reste du fichier sur blog.html
  }

(function () {
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));
  const get = (url) => fetch(url, { credentials: 'same-origin' }).then(r => r.ok ? r.json() : Promise.reject(r));

  function getParam(name) {
    const m = new URLSearchParams(location.search).get(name);
    return m ? decodeURIComponent(m) : null;
  }

  function detectLocale() {
    const u = new URL(location.href);
    const p = getParam('locale');
    if (p) return p.toLowerCase();
    const htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (htmlLang.startsWith('en')) return 'en';
    return 'fr';
  }

  // ------- Liste (blog.html) -------
  async function renderList() {
    const host = qs('#posts-list');
    if (!host) return;

    const locale = detectLocale();
    const data = await get(`/api/posts-index?locale=${locale}`);
    if (!data.items || !data.items.length) {
      host.innerHTML = `<p>Aucun article pour le moment.</p>`;
      return;
    }

    const cards = data.items.map(p => {
      const date = p.date ? new Date(p.date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      const img = p.cover ? `<img src="${p.cover}" alt="${p.cover_alt || ''}" loading="lazy" style="width:100%;height:auto;border-radius:12px;margin-bottom:8px" />` : '';
      return `
        <article class="post-card" style="padding:16px;border:1px solid #1f2937;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,.12)">
          ${img}
          <h3 style="margin:8px 0 6px;font-size:1.15rem"><a href="${p.url}">${p.title}</a></h3>
          <div style="opacity:.7;font-size:.9rem">${date} · ${p.reading_time || ''}</div>
          ${p.excerpt ? `<p style="margin:8px 0 0">${p.excerpt}</p>` : ''}
        </article>`;
    });

    host.innerHTML = `<div class="grid" style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">${cards.join('')}</div>`;
  }

  // ------- Lecture (post.html) -------
  async function renderPost() {
    const mount = qs('#post-content');
    if (!mount) return;

    const locale = detectLocale();
    const slug = getParam('slug');
    if (!slug) {
      mount.innerHTML = `<p>Article introuvable (slug manquant).</p>`;
      return;
    }

    try {
      const { meta, html } = await get(`/api/post?locale=${locale}&slug=${encodeURIComponent(slug)}`);

      // Titre, cover, méta si éléments présents
      const titleEl = qs('#post-title');
      const metaEl = qs('#post-meta');
      const coverEl = qs('#post-cover');

      if (titleEl) titleEl.textContent = meta.title;
      if (metaEl) {
        const date = meta.date ? new Date(meta.date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
        metaEl.textContent = [date, meta.reading_time].filter(Boolean).join(' · ');
      }
      if (coverEl && meta.cover) {
        coverEl.innerHTML = `<img src="${meta.cover}" alt="${meta.cover_alt || ''}" style="width:100%;height:auto;border-radius:14px" />`;
      }

      mount.innerHTML = html;
      // Optionnel: scroll top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      mount.innerHTML = `<p>Article introuvable.</p>`;
    }
  }

  // Auto-run
  renderList();
  renderPost();
})();

