/* assets/js/render.js — namespace sécurisé (pas de collision globale)
   - Remplit Accueil (#latestGrid), Liste (#postsList), Post (#postTitle/#postContent)
   - Propage systématiquement la langue dans les liens vers post.html (?lang=fr|en)
   - Lit ?lang=fr|en à l’arrivée puis rend dans la bonne langue
*/
(() => {
  /* ============ helpers i18n & format ============ */
  const currentLang = () => {
    try {
      if (typeof Lang !== "undefined" && typeof Lang.get === "function") return Lang.get();
      if (typeof window.getLang === "function") return window.getLang(); // fallback éventuel (data.js)
    } catch (_) {}
    return "fr";
  };

  // Si on arrive avec ?lang=fr|en on synchronise la langue AVANT tout rendu
  function syncLangFromQuery() {
    try {
      const q = new URLSearchParams(location.search);
      const l = (q.get("lang") || "").toLowerCase();
      if (l === "fr" || l === "en") {
        if (typeof Lang !== "undefined" && typeof Lang.set === "function") Lang.set(l);
      }
    } catch (_) {}
  }

  /** Choisit propriété FR/EN (ex: title / title_en) */
  function pick(obj, baseKey) {
    const enKey = `${baseKey}_en`;
    if (currentLang() === "en") {
      return (obj[enKey] || obj[baseKey] || "").toString();
    }
    return (obj[baseKey] || obj[enKey] || "").toString();
  }

  /** Retire un H1/H2/H3 tout en tête (si présent dans content) */
  function stripLeadingHeading(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    const first = tmp.firstElementChild;
    if (first && /^H[1-3]$/.test(first.tagName)) first.remove();
    return tmp.innerHTML;
  }

  /** Date locale jolie */
  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      const lang = currentLang();
      return new Intl.DateTimeFormat(lang === "en" ? "en-CA" : "fr-CA", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(d);
    } catch (_) {
      return iso || "";
    }
  }

  /** Tronque du HTML en texte simple */
  function truncateHtml(html, n = 150) {
    const txt = (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return txt.length <= n ? txt : txt.slice(0, n - 1) + "…";
  }

  /** Tri éditorial: order prioritaire, puis date (desc/asc) */
  function comparePosts(a, b, dir = "desc") {
    const ao = Number.isFinite(a.order) ? a.order : Infinity;
    const bo = Number.isFinite(b.order) ? b.order : Infinity;
    if (ao !== bo) return ao - bo; // plus petit "order" en premier

    const ad = new Date(a.date).getTime();
    const bd = new Date(b.date).getTime();
    return dir === "asc" ? ad - bd : bd - ad;
  }

  /** Tableau des posts (POSTS défini dans data.js) */
  function allPosts() {
    if (Array.isArray(window.POSTS)) return window.POSTS.slice();
    if (typeof window.getPosts === "function") return window.getPosts().slice();
    return [];
  }

  /** URL vers un post en propageant TOUJOURS la langue courante */
  function postURL(post) {
    const lang = currentLang(); // "fr" ou "en"
    const base = `post.html?id=${encodeURIComponent(post.id)}`;
    return `${base}&lang=${lang}`;
  }

  /* ============ Accueil ============ */
  function renderHome() {
    const grid = document.getElementById("latestGrid");
    if (!grid) return; // pas sur Accueil

    const posts = allPosts()
      .sort(comparePosts)   // ← ordre éditorial puis date (desc)
      .slice(0, 3);

    grid.innerHTML = posts
      .map(
        (p) => `
      <article class="card">
        <div class="meta">${fmtDate(p.date)} · ${p.readTime || p.read_min || p.read || 8} min · ${pick(
          p,
          "category"
        )}</div>
        <h3><a href="${postURL(p)}">${pick(p, "title")}</a></h3>
        <p>${truncateHtml(pick(p, "excerpt") || pick(p, "content"), 160)}</p>
        <a class="btn ghost" href="${postURL(p)}">${currentLang() === "en" ? "Read →" : "Lire →"}</a>
      </article>`
      )
      .join("");
  }

  /* ============ Liste (blog.html) ============ */
  function renderList() {
    const wrap  = document.getElementById("postsList") || document.getElementById("postList");
    const qEl   = document.getElementById("searchInput");
    const catEl = document.getElementById("categoryFilter");
    const sortEl= document.getElementById("sortSelect") || document.getElementById("sortBy");
    if (!wrap) return; // pas sur la page liste

    const q    = (qEl && qEl.value.trim().toLowerCase()) || "";
    const cat  = (catEl && catEl.value) || "all";
    const sort = (sortEl && sortEl.value) || "newest";

    let posts = allPosts();

    if (q) {
      posts = posts.filter((p) => {
        const hay = (pick(p, "title") + " " + (pick(p, "excerpt") || pick(p, "content"))).toLowerCase();
        return hay.includes(q);
      });
    }

    if (cat !== "all") {
      posts = posts.filter((p) => ((p.category || "") + "").toLowerCase() === cat.toLowerCase());
    }

    // tri (respecte l'ordre éditorial, puis la date selon le select)
    posts.sort((a, b) => comparePosts(a, b, sort === "oldest" ? "asc" : "desc"));

    wrap.innerHTML = posts
      .map(
        (p) => `
        <article class="card">
          <div class="meta">${fmtDate(p.date)} · ${p.readTime || p.read_min || p.read || 8} min · ${pick(
            p,
            "category"
          )}</div>
          <h3><a href="${postURL(p)}">${pick(p, "title")}</a></h3>
          <p>${truncateHtml(pick(p, "excerpt") || pick(p, "content"), 180)}</p>
          <a class="btn ghost" href="${postURL(p)}">${currentLang() === "en" ? "Read →" : "Lire →"}</a>
        </article>`
      )
      .join("");

    // Placeholder recherche selon langue
    if (qEl) {
      if (typeof Lang !== "undefined" && typeof Lang.t === "function") {
        qEl.placeholder = Lang.t("search_ph");
      } else {
        qEl.placeholder = currentLang() === "en" ? "Search an article…" : "Rechercher un article…";
      }
    }
  }

  /* ============ Post (post.html) ============ */
  function renderPost() {
    const titleEl   = document.getElementById("postTitle");
    const contentEl = document.getElementById("postContent");
    if (!titleEl && !contentEl) return; // pas sur post.html

    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if (!id) return;

    const post = allPosts().find((p) => p.id === id);
    if (!post) return;

    const title = pick(post, "title");
    const html  = stripLeadingHeading(pick(post, "content"));

    if (titleEl)   titleEl.textContent = title;
    if (contentEl) contentEl.innerHTML = html;

    try {
      document.title = `${title} — Bluekiosktech.blog`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        const raw = pick(post, "excerpt") || truncateHtml(html, 160);
        meta.setAttribute("content", raw.replace(/<[^>]+>/g, "").slice(0, 160));
      }
    } catch (_) {}
  }

  /* ============ Boot + Listeners ============ */
  function rerenderAll() {
    // i18n statique
    if (typeof applyI18N === "function") applyI18N();
    // s’il existe un refresh côté data.js (pour re-pointer POSTS FR/EN)
    if (typeof window.refreshPosts === "function") window.refreshPosts();
    // rendu UI
    renderHome();
    renderList();
    renderPost();
  }

  document.addEventListener("DOMContentLoaded", () => {
    syncLangFromQuery();   // 1) applique ?lang= dès l’arrivée
    rerenderAll();         // 2) rend tout

    // Filtres liste
    const qEl   = document.getElementById("searchInput");
    const catEl = document.getElementById("categoryFilter");
    const sortEl= document.getElementById("sortSelect") || document.getElementById("sortBy");
    if (qEl)   qEl.addEventListener("input",   renderList);
    if (catEl) catEl.addEventListener("change",renderList);
    if (sortEl)sortEl.addEventListener("change",renderList);

    // Switch langue
    const fr = document.getElementById("lang-fr");
    const en = document.getElementById("lang-en");
    const onSwitch = (code) => {
      if (typeof Lang !== "undefined" && typeof Lang.set === "function") Lang.set(code);
      rerenderAll();
    };
    if (fr) fr.addEventListener("click", () => onSwitch("fr"));
    if (en) en.addEventListener("click", () => onSwitch("en"));
  });

  // Expose pour debug (optionnel)
  window.BKRender = { renderHome, renderList, renderPost, rerenderAll };
})();
