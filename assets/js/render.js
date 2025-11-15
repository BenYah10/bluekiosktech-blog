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
      .replace(/[’']/g, "'")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s'-]/g, "")
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

  // insère un bloc HTML juste AVANT un <h2> dont le texte correspond
  function insertBeforeH2(contentRoot, headingText, html, id = "postInlineBeforeH2"){
    if (!contentRoot || document.getElementById(id)) return;
    const wanted = norm(headingText);
    const h2s = contentRoot.querySelectorAll("h2");
    for (const h2 of h2s){
      const hay = norm(h2.textContent);
      if (hay.includes(wanted) || wanted.includes(hay)){
        const fig = document.createElement("figure");
        fig.id = id;
        fig.className = "post-inline";
        fig.innerHTML = html;
        h2.insertAdjacentElement("beforebegin", fig);
        break;
      }
    }
  }

  /** Tri éditorial: order prioritaire, puis date (desc/asc) */
  function comparePosts(a, b, dir = "desc") {
    const ao = Number.isFinite(a.order) ? a.order : Infinity;
    const bo = Number.isFinite(b.order) ? b.order : Infinity;
    if (ao !== bo) return ao - bo;

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
    const lang = currentLang();
    const base = `post.html?id=${encodeURIComponent(post.id)}`;
    return `${base}&lang=${lang}`;
  }

  /* ============ Vignettes (cards) ============ */
  function cardMediaHTML(post){
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
    if (!grid) return;

    const posts = allPosts()
      .sort(comparePosts)
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
    if (!wrap) return;

    const q    = (qEl && qEl.value.trim().toLowerCase()) || "";
    const catRaw  = (catEl && catEl.value) || "";
    const cat = catRaw || "all";

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
    if (!titleEl && !contentEl) return;

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
        const old = document.getElementById("postHero");
        if (old) old.remove();

        const fig = document.createElement("figure");
        fig.id = "postHero";
        fig.className = "post-hero";
        const alt = pick(post, "imageAlt") || title;
        fig.innerHTML = `<img src="${imgSrc}" alt="${esc(alt)}" />`;

        titleEl.parentNode.insertBefore(fig, titleEl);

        setMeta("og:image", imgSrc);
        setMeta("twitter:image", imgSrc, "name");
      }
    } catch (_) {}

        // --- VIDÉO inline pour l'article hidden-dangers-dirty-bottles (FR & EN) ---
    try {
      if (post.id === "hidden-dangers-dirty-bottles" || post.slug === "hidden-dangers-dirty-bottles") {
        const videoHtml = `
          <video
            src="assets/videos/bacteria.webm"
            loop
            muted
            playsinline
            controls
            preload="auto"
            aria-label="${esc(
              currentLang() === 'en'
                ? 'Animated visualization of harmful bacteria developing inside a poorly cleaned reusable bottle'
                : 'Animation montrant la prolifération de bactéries dans une gourde mal nettoyée'
            )}"
            style="display:block;margin-left:auto;margin-right:auto;height:auto;width:100%;max-width:880px;border-radius:12px;"
          ></video>`;

        // Nettoyage si on rerend plusieurs fois (changement de langue, etc.)
        ["postInlineBacteriaVideoFR", "postInlineBacteriaVideoEN"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.remove();
        });

        // FR : sous le H2 « Les bactéries nuisibles… »
        insertAfterH2(
          contentEl,
          "Les bactéries nuisibles les plus fréquentes dans les gourdes mal nettoyées",
          videoHtml,
          "postInlineBacteriaVideoFR"
        );

        // EN : sous le H2 « The Most Common Harmful Bacteria… »
        insertAfterH2(
          contentEl,
          "The Most Common Harmful Bacteria Found in Dirty Bottles",
          videoHtml,
          "postInlineBacteriaVideoEN"
        );
      }
    } catch (_) {}

        // --- Image APRES le H2 "La solution BlueKioskTech..." (FR/EN)
    //     pour l'article hidden-dangers-dirty-bottles
    try {
      if (post.id === "hidden-dangers-dirty-bottles" || post.slug === "hidden-dangers-dirty-bottles") {
        const imgHtml = `
          <img
            src="assets/images/posts/Common-Harmful-Bacteria/Solution-BKT-GYM.png"
            alt="${esc(
              currentLang() === 'en'
                ? 'BlueKioskTech self-service disinfection station in a gym'
                : 'Station de désinfection BlueKioskTech en libre-service dans un gym'
            )}"
            loading="lazy"
            decoding="async">
        `;

        // On supprime l’ancienne version si jamais elle existe déjà
        const old = document.getElementById("postInlineSolutionBKT");
        if (old) old.remove();

        // FR : juste sous le H2 "La solution BlueKioskTech..."
        insertAfterH2(
          contentEl,
          "La solution BlueKioskTech : désinfection rapide et accessible",
          imgHtml,
          "postInlineSolutionBKT"
        );

        // EN : sous le H2 équivalent en anglais (si tu as la version EN)
        insertAfterH2(
          contentEl,
          "BlueKioskTech’s Solution: Fast, Accessible Disinfection",
          imgHtml,
          "postInlineSolutionBKT"
        );
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

        ["postInlineHG99FR", "postInlineHG99EN"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.remove();
        });

        insertAfterH2(
          contentEl,
          "La réponse BlueKioskTech : technologie VUCS",
          imgFR,
          "postInlineHG99FR"
        );

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

        insertAfterH2(
          contentEl,
          "Ce que cela signifie pour l'hygiène au quotidien",
          imgHtml,
          "postInlineQuotidien"
        );

        insertAfterH2(
          contentEl,
          "What this means for everyday hygiene",
          imgHtml,
          "postInlineQuotidienEN"
        );
      }
    } catch (_) {}


         // --- VIDEO inline pour l'article immunite-hier-vs-aujourdhui (FR & EN) ---
    try {
      if (post.id === "immunite-hier-vs-aujourdhui" || post.slug === "immunite-hier-vs-aujourdhui") {

        const videoHtml = `
          <video
            src="assets/videos/immunity.webm"
            autoplay
            muted
            loop
            playsinline
            preload="auto"
            aria-label="${esc(
              currentLang() === 'en'
                ? 'Animated explanation of how stress, waves and modern lifestyle impact immunity'
                : 'Animation expliquant comment le stress, les ondes et le mode de vie moderne impactent l’immunité'
            )}"
            style="display:block;width:100%;max-width:880px;margin:20px auto;border-radius:12px;"
          ></video>`;

        // Nettoyage si la page est rerendue (changement de langue, etc.)
        ["postInlineImmunityFR", "postInlineImmunityEN"].forEach((id) => {
          const existing = document.getElementById(id);
          if (existing) existing.remove();
        });

        // FR : sous le H2 "Stress, ondes et mode de vie : nouveaux ennemis invisibles"
        insertAfterH2(
          contentEl,
          "Stress, ondes et mode de vie : nouveaux ennemis invisibles",
          videoHtml,
          "postInlineImmunityFR"
        );

        // EN : adapter EXACTEMENT au texte du H2 anglais si tu l'as
        insertAfterH2(
          contentEl,
          "Stress, waves and lifestyle: new invisible enemies",
          videoHtml,
          "postInlineImmunityEN"
        );
      }
    } catch (_) {}


         // --- VIDÉO inline pour l'article hidden-dangers-dirty-bottles (FR & EN)
    try {
      if (post.id === "hidden-dangers-dirty-bottles" || post.slug === "hidden-dangers-dirty-bottles") {
        const videoHtml = `
          <video
            src="assets/videos/bacteria.webm"
            autoplay
            muted
            loop
            playsinline
            preload="auto"
            aria-label="${esc(
              currentLang() === 'en'
                ? 'Animated visualization of bacterial growth in a dirty bottle'
                : 'Animation montrant la prolifération de bactéries dans une gourde mal nettoyée'
            )}"
            style="display:block;width:100%;max-width:880px;margin:0 auto;border-radius:12px;"
          ></video>`;

        // FR : sous le H2 "Les bactéries nuisibles les plus fréquentes dans les gourdes mal nettoyées"
        insertAfterH2(
          contentEl,
          "Les bactéries nuisibles les plus fréquentes dans les gourdes mal nettoyées",
          videoHtml,
          "postInlineBacteriaVideoFR"
        );

        // EN : sous le H2 "The Most Common Harmful Bacteria Found in Dirty Bottles"
        insertAfterH2(
          contentEl,
          "The Most Common Harmful Bacteria Found in Dirty Bottles",
          videoHtml,
          "postInlineBacteriaVideoEN"
        );
      }
    } catch (_) {}

    // --- IMAGES inline pour l'article checklist-implantation-gym (FR & EN)
    try {
      if (post.id === "checklist-implantation-gym" || post.slug === "checklist-implantation-gym") {
        const imgGym = `
          <img src="assets/images/posts/checklist-implantation/gym.png"
               alt="${esc(currentLang()==='en'
                 ? 'Example gym zones for unit placement'
                 : 'Exemple de zones en salle de sport pour le placement de l’unité')}"
               loading="lazy" decoding="async">`;

        const imgOffice = `
          <img src="assets/images/posts/checklist-implantation/office.png"
               alt="${esc(currentLang()==='en'
                 ? 'Example office/workplace areas for unit placement'
                 : 'Exemples d’espaces bureaux pour le placement de l’unité')}"
               loading="lazy" decoding="async">`;

        const imgCampus = `
          <img src="assets/images/posts/checklist-implantation/compus.png"
               alt="${esc(currentLang()==='en'
                 ? 'Example campus & university areas for unit placement'
                 : 'Exemples d’espaces campus & universités pour le placement de l’unité')}"
               loading="lazy" decoding="async">`;

        ["chkGymAfterH2EN","chkGymAfterH2FR","chkOfficeBeforeEN","chkOfficeBeforeFR","chkCampusBeforeEN","chkCampusBeforeFR"]
          .forEach(id => { const n = document.getElementById(id); if (n) n.remove(); });

        insertAfterH2(contentEl, "Recommended placements", imgGym, "chkGymAfterH2EN");
        insertAfterH2(contentEl, "Emplacements recommandés", imgGym, "chkGymAfterH2FR");

        insertBeforeH3(contentEl, "In offices & workplaces", imgOffice, "chkOfficeBeforeEN");
        insertBeforeH3(contentEl, "Dans les bureaux & espaces professionnels", imgOffice, "chkOfficeBeforeFR");

        insertBeforeH3(contentEl, "On campuses & universities", imgCampus, "chkCampusBeforeEN");
        insertBeforeH3(contentEl, "Campus & universités", imgCampus, "chkCampusBeforeFR");
      }
    } catch (_) {}

    /* --- NOUVEAU : Bannière avant le H2 "Et votre gourde..." (FR/EN)
       • Aucune dépendance à l'id du post : si ce H2 est présent, on injecte.
       • Mets tes fichiers au chemin ci-dessous (ou adapte les chemins). */
    try {
      const imgFR = `<img src="assets/images/posts/microbiome-bottle-risk/40K-fr.png"
                         alt="${esc('Votre gourde pourrait être 40 000 fois plus contaminée qu’un siège de toilette — et vous buvez dedans chaque jour')}"
                         loading="lazy" decoding="async">`;
      const imgEN = `<img src="assets/images/posts/microbiome-bottle-risk/40K-en.png"
                         alt="${esc('Your water bottle could be 40,000× dirtier than a toilet seat — and you drink from it daily')}"
                         loading="lazy" decoding="async">`;

      ["bottleBannerFR", "bottleBannerEN"].forEach(id => { const n = document.getElementById(id); if (n) n.remove(); });

      insertBeforeH2(contentEl, "Et votre gourde dans tout ça ?", imgFR, "bottleBannerFR");
      insertBeforeH2(contentEl, "And your water bottle in all this?", imgEN, "bottleBannerEN");
      insertBeforeH2(contentEl, "And your bottle in all this?", imgEN, "bottleBannerEN");
    } catch (_) {}

    /* === NOUVEAU : premier article — image après le 2e H2 "Ce que nous faisons…" / "What we do…" === */
    try {
      if (post.id === "comprendre-bacteries-mental-physique") {
        const lang = (new URLSearchParams(location.search).get('lang') || 'fr').toLowerCase();
        const h2s = contentEl.querySelectorAll('h2');
        if (h2s.length) {
          // cibler le 2e h2 si possible, sinon on cherche par texte
          let targetH2 = h2s[1] || null;

          const expectedFR = "ce que nous faisons chez bluekiosktech";
          const expectedEN = "what we do at bluekiosktech";
          const wanted = (lang === 'en') ? expectedEN : expectedFR;

          const isMatch = targetH2 && norm(targetH2.textContent).includes(wanted);
          if (!isMatch) {
            targetH2 = Array.from(h2s).find(h => norm(h.textContent).includes(wanted)) || targetH2;
          }

          if (targetH2) {
            const existing = targetH2.nextElementSibling;
            if (!(existing && existing.classList && existing.classList.contains('post-inline'))) {
              const src = (lang === 'en')
                ? 'assets/images/posts/hygiene-gourdes-99-2min/Couverture-Fb-en.png'
                : 'assets/images/posts/hygiene-gourdes-99-2min/Couverture-Fb-fr.png';
              const alt = (lang === 'en')
                ? 'What you drink should hydrate you, not contaminate you'
                : 'Ce que tu bois devrait t’hydrater, pas te contaminer';

              const fig = document.createElement('figure');
              fig.className = 'post-inline';
              fig.innerHTML = `<img src="${src}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
              targetH2.insertAdjacentElement('afterend', fig);
            }
          }
        }
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

        /* ============ À propos (about.html) ============ */
  function renderAbout() {
    // H1 "Notre mission" (clé i18n about_mission_title)
    const h1 = document.querySelector('h1[data-i18n="about_mission_title"]');
    if (!h1) return; // on n'est pas sur about.html

    // Évite les doublons si on rerend (changement de langue, etc.)
    const existing = document.getElementById("aboutMissionVideo");
    if (existing) existing.remove();

    const fig = document.createElement("figure");
    fig.id = "aboutMissionVideo";
    fig.className = "post-inline";
    fig.innerHTML = `
      <video
        src="assets/videos/notre-mission.webm"
        autoplay
        muted
        loop
        playsinline
        preload="auto"
        aria-label="${esc(
          currentLang() === "en"
            ? "Animated presentation of BlueKioskTech’s mission"
            : "Présentation animée de la mission de BlueKioskTech"
        )}"
        style="display:block;width:100%;max-width:880px;margin:1.5rem auto;border-radius:12px;"
      ></video>
    `;

    // On insère la vidéo juste après le H1
    h1.insertAdjacentElement("afterend", fig);
   }

   /* ============ Boot + Listeners ============ */
  function rerenderAll() {
    if (typeof applyI18N === "function") applyI18N();
    if (typeof window.refreshPosts === "function") window.refreshPosts();
    renderHome();
    renderList();
    renderPost();
    renderAbout(); // ← appel ajouté ici
  }


  document.addEventListener("DOMContentLoaded", () => {
    syncLangFromQuery();
    rerenderAll();

    const p = new URLSearchParams(location.search);
    const cat = (p.get("cat") || "").toLowerCase();
    const sel = document.getElementById("categoryFilter");
    if (sel && cat && [...sel.options].some(o => o.value === cat)) {
      sel.value = cat;
    }
    if (typeof renderList === "function") renderList();

    const qEl   = document.getElementById("searchInput");
    const catEl = document.getElementById("categoryFilter");
    const sortEl= document.getElementById("sortSelect") || document.getElementById("sortBy");
    if (qEl)   qEl.addEventListener("input",   renderList);
    if (catEl) catEl.addEventListener("change",renderList);
    if (sortEl)sortEl.addEventListener("change",renderList);

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
  window.BKRender = { renderHome, renderList, renderPost, renderAbout, rerenderAll };
})();
