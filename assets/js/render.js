/* assets/js/render.js — namespace sécurisé (pas de collision globale)
   - Remplit Accueil (#latestGrid), Liste (#postsList/#postList), Post (#postTitle/#postContent)
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

  /** Échappement simple pour attributs HTML */
  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  /** Set/Update meta tags (og:*, twitter:*, etc.) */
  function setMeta(prop, content, attr = "property") {
    if (!content) return;
    let el = document.head.querySelector(`meta[${attr}="${prop}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, prop);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  /** ---------- Helpers pour l’insertion ciblée ---------- */

  // normalisation pour comparer des titres (accents/espaces/apostrophes)
  function norm(s){
    return String(s || "")
      .replace(/[’']/g, "'")                  // apostrophes uniformisées
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // enlève les accents
      .replace(/[^\w\s'-]/g, "")              // retire emojis/punctuations exotiques
      .toLowerCase()
      .replace(/\s+/g," ")
      .trim();
  }

  // insère un bloc HTML juste après un <h2> dont le texte correspond
  function insertAfterH2(contentRoot, headingText, html, id = "postInlineQuotidien"){
    if (!contentRoot || document.getElementById(id)) return;
    const wanted = norm(headingText);
    const h2s = contentRoot.querySelectorAll("h2");
    for (const h2 of h2s){
      const hay = norm(h2.textContent);
      // correspondance tolérante (partielle possible)
      if (hay.includes(wanted) || wanted.includes(hay)){
        const fig = document.createElement("figure");
        fig.id = id;
        fig.className = "post-inline";
        fig.innerHTML = html;
        h2.insertAdjacentElement("afterend", fig);
        break;
      }
    }
  }

  // insère un bloc HTML juste AVANT un <h3> dont le texte correspond
  function insertBeforeH3(contentRoot, headingText, html, id = "postInlineBeforeH3"){
    if (!contentRoot || document.getElementById(id)) return;
    const wanted = norm(headingText);
    const h3s = contentRoot.querySelectorAll("h3");
    for (const h3 of h3s){
      const hay = norm(h3.textContent);
      if (hay.includes(wanted) || wanted.includes(hay)){
        const fig = document.createElement("figure");
        fig.id = id;
        fig.className = "post-inline";
        fig.innerHTML = html;
        h3.insertAdjacentElement("beforebegin", fig);
        break;
      }
    }
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

  /* ============ Vignettes (cards) ============ */
  // Génère la vignette d’une card (ou rien si pas d’image)
  function cardMediaHTML(post){
    // préférence 640 comme src (net + léger), avec srcset
    const base = post.image640 || post.image320 || post.image || post.image960 || post.imageLarge;
    if (!base) return "";

    const src320 = post.image320 || base;
    const src640 = post.image640 || base;
    const src960 = post.image960 || post.imageLarge || base;
    const alt    = pick(post, "imageAlt") || pick(post, "title");

    return `
      <a class="card-media" href="${postURL(post)}" aria-label="${esc(pick(post,"title"))}">
        <img
          src="${src640}"
          srcset="${src320} 320w, ${src640} 640w, ${src960} 960w"
          sizes="(max-width: 760px) 100vw, 340px"
          alt="${esc(alt)}"
          loading="lazy" decoding="async">
      </a>
    `;
  }

  /* ============ Accueil ============ */
  function renderHome() {
    const grid = document.getElementById("latestGrid");
    if (!grid) return; // pas sur Accueil

    const posts = allPosts()
      .sort(comparePosts)   // ← ordre éditorial puis date (desc)
      .slice(0, 3);

    grid.innerHTML = posts.map((p) => `
      <article class="card">
        ${cardMediaHTML(p)}
        <div class="meta">${fmtDate(p.date)} · ${p.readTime || p.read_min || p.read || 8} min · ${pick(p,"category")}</div>
        <h3><a href="${postURL(p)}">${pick(p,"title")}</a></h3>
        <p>${truncateHtml(pick(p,"excerpt") || pick(p,"content"), 160)}</p>
        <a class="btn ghost" href="${postURL(p)}">${currentLang() === "en" ? "Read →" : "Lire →"}</a>
      </article>
    `).join("");
  }

  /* ============ Liste (blog.html) ============ */
  function renderList() {
    const wrap  = document.getElementById("postsList") || document.getElementById("postList");
    const qEl   = document.getElementById("searchInput");
    const catEl = document.getElementById("categoryFilter");
    const sortEl= document.getElementById("sortSelect") || document.getElementById("sortBy");
    if (!wrap) return; // pas sur la page liste

    const q    = (qEl && qEl.value.trim().toLowerCase()) || "";
    const catRaw  = (catEl && catEl.value) || "";
    const cat = catRaw || "all";

    // on accepte aussi les valeurs "date_asc"/"date_desc" en plus de newest/oldest
    const sortRaw = (sortEl && sortEl.value) || "newest";
    const sort = (sortRaw === "oldest" || sortRaw === "date_asc") ? "oldest" : "newest";

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

    wrap.innerHTML = posts.map((p) => `
      <article class="card">
        ${cardMediaHTML(p)}
        <div class="meta">${fmtDate(p.date)} · ${p.readTime || p.read_min || p.read || 8} min · ${pick(p,"category")}</div>
        <h3><a href="${postURL(p)}">${pick(p,"title")}</a></h3>
        <p>${truncateHtml(pick(p,"excerpt") || pick(p,"content"), 180)}</p>
        <a class="btn ghost" href="${postURL(p)}">${currentLang() === "en" ? "Read →" : "Lire →"}</a>
      </article>
    `).join("");

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

    // --- HERO IMAGE (injection au-dessus du H1) ---
    try {
      const imgSrc = post.imageLarge || post.image;
      if (imgSrc && titleEl && titleEl.parentNode) {
        // retirer un ancien hero si on a re-rendu
        const old = document.getElementById("postHero");
        if (old) old.remove();

        const fig = document.createElement("figure");
        fig.id = "postHero";
        fig.className = "post-hero";
        const alt = pick(post, "imageAlt") || title;
        fig.innerHTML = `<img src="${imgSrc}" alt="${esc(alt)}" />`;

        titleEl.parentNode.insertBefore(fig, titleEl);

        // Meta pour partage social
        setMeta("og:image", imgSrc);
        setMeta("twitter:image", imgSrc, "name");
      }
    } catch (_) {}

    // --- Image APRES le H2 "VUCS technology" (FR/EN) pour l'article hygiene-gourdes-99-2min
    try {
      if (post.id === "hygiene-gourdes-99-2min" || post.slug === "hygiene-gourdes-99-2min") {
        const imgFR = `<img src="assets/images/posts/hygiene-gourdes-99-2min/Couverture-Fb-fr.png"
                            alt="${esc('Ce que tu bois devrait t’hydrater, pas te contaminer')}"
                            loading="lazy" decoding="async">`;
        const imgEN = `<img src="assets/images/posts/hygiene-gourdes-99-2min/Couverture-Fb-en.png"
                            alt="${esc('What you drink should hydrate you, not contaminate you')}"
                            loading="lazy" decoding="async">`;

        // On retire une éventuelle ancienne insertion
        ["postInlineHG99FR", "postInlineHG99EN"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.remove();
        });

        // FR — après "La réponse BlueKioskTech : technologie VUCS"
        insertAfterH2(
          contentEl,
          "La réponse BlueKioskTech : technologie VUCS",
          imgFR,
          "postInlineHG99FR"
        );

        // EN — après "BlueKioskTech’s answer: VUCS technology"
        insertAfterH2(
          contentEl,
          "BlueKioskTech’s answer: VUCS technology",
          imgEN,
          "postInlineHG99EN"
        );
      }
    } catch (_) {}

    // --- Image immédiatement après le H2 ciblé (FR/EN) pour l'article immunite-collective-hygiene ---
    try {
      if (post.id === "immunite-collective-hygiene" || post.slug === "immunite-collective-hygiene") {
        const imgHtml = `<img src="assets/images/posts/immunite-collective-hygiene/inline-prototype.png"
                              alt="${esc(currentLang()==='en' ? 'BlueKiosk machine disinfecting a bottle' : 'Machine BlueKiosk désinfectant une gourde')}"
                              loading="lazy" decoding="async">`;

        // Français
        insertAfterH2(
          contentEl,
          "Ce que cela signifie pour l'hygiène au quotidien",
          imgHtml,
          "postInlineQuotidien"
        );

        // Anglais
        insertAfterH2(
          contentEl,
          "What this means for everyday hygiene",
          imgHtml,
          "postInlineQuotidienEN"
        );
      }
    } catch (_) {}

    // --- IMAGES inline pour l'article checklist-implantation-gym (FR & EN)
    try {
      if (post.id === "checklist-implantation-gym" || post.slug === "checklist-implantation-gym") {
        // 4.png -> gym.png (après H2 "Recommended placements" / "Emplacements recommandés")
        const imgGym = `
          <img src="assets/images/posts/checklist-implantation/gym.png"
               alt="${esc(currentLang()==='en'
                 ? 'Example gym zones for unit placement'
                 : 'Exemple de zones en salle de sport pour le placement de l’unité')}"
               loading="lazy" decoding="async">`;

        // 5.png -> office.png (avant H3 "In offices & workplaces" / "Dans les bureaux & espaces professionnels")
        const imgOffice = `
          <img src="assets/images/posts/checklist-implantation/office.png"
               alt="${esc(currentLang()==='en'
                 ? 'Example office/workplace areas for unit placement'
                 : 'Exemples d’espaces bureaux pour le placement de l’unité')}"
               loading="lazy" decoding="async">`;

        // 6.png -> compus.png (avant H3 "On campuses & universities" / "Campus & universités")
        const imgCampus = `
          <img src="assets/images/posts/checklist-implantation/compus.png"
               alt="${esc(currentLang()==='en'
                 ? 'Example campus & university areas for unit placement'
                 : 'Exemples d’espaces campus & universités pour le placement de l’unité')}"
               loading="lazy" decoding="async">`;

        // Nettoyage d'anciennes insertions si rerender
        ["chkGymAfterH2EN","chkGymAfterH2FR","chkOfficeBeforeEN","chkOfficeBeforeFR","chkCampusBeforeEN","chkCampusBeforeFR"]
          .forEach(id => { const n = document.getElementById(id); if (n) n.remove(); });

        // 1) Après H2
        insertAfterH2(contentEl, "Recommended placements", imgGym, "chkGymAfterH2EN");
        insertAfterH2(contentEl, "Emplacements recommandés", imgGym, "chkGymAfterH2FR");

        // 2) Avant H3 — Offices
        insertBeforeH3(contentEl, "In offices & workplaces", imgOffice, "chkOfficeBeforeEN");
        insertBeforeH3(contentEl, "Dans les bureaux & espaces professionnels", imgOffice, "chkOfficeBeforeFR");

        // 3) Avant H3 — Campus
        insertBeforeH3(contentEl, "On campuses & universities", imgCampus, "chkCampusBeforeEN");
        insertBeforeH3(contentEl, "Campus & universités", imgCampus, "chkCampusBeforeFR");
      }
    } catch (_) {}

    // --- Meta title/description ---
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

    // Pré-sélection de la catégorie via ?cat=...
    const p = new URLSearchParams(location.search);
    const cat = (p.get("cat") || "").toLowerCase();
    const sel = document.getElementById("categoryFilter");
    if (sel && cat && [...sel.options].some(o => o.value === cat)) {
      sel.value = cat;
    }
    if (typeof renderList === "function") renderList();

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
