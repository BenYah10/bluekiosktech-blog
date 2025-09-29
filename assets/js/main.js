// assets/js/main.js

/* ====== Utiles ====== */
document.addEventListener('DOMContentLoaded', () => {
  // Année footer
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

/* ====== Menu mobile (☰) — délégation robuste ======
   - Fonctionne même si le DOM change ou si le script charge avant le HTML
   - Requiert: <button id="menuToggle" ...> et <nav id="nav" class="nav"> */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#menuToggle');
  if (!btn) return;

  const nav = document.getElementById('nav');
  if (!nav) return;

  e.preventDefault();
  const open = nav.classList.toggle('open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
});

// Accessibilité clavier sur le bouton menu
document.addEventListener('keydown', (e) => {
  const btn = document.getElementById('menuToggle');
  if (!btn) return;
  if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === btn) {
    e.preventDefault();
    btn.click();
  }
});

/* ====== Switch FR/EN ======
   - Requiert (si présent dans la page) :
     <div class="lang-switch lang--header">
       <button id="lang-fr">FR</button><button id="lang-en">EN</button>
     </div>
*/
document.addEventListener('DOMContentLoaded', () => {
  const frBtn = document.getElementById('lang-fr');
  const enBtn = document.getElementById('lang-en');
  const hasSwitch = !!(frBtn && enBtn);

  const applyLang = (code) => {
    if (typeof Lang === 'undefined') return;
    const val = Lang.set(code === 'en' ? 'en' : 'fr');

    if (hasSwitch) {
      frBtn.classList.toggle('is-active', val === 'fr');
      enBtn.classList.toggle('is-active', val === 'en');
      frBtn.setAttribute('aria-pressed', String(val === 'fr'));
      enBtn.setAttribute('aria-pressed', String(val === 'en'));
    }

    if (typeof applyI18N === 'function') applyI18N();
    if (typeof refreshPosts === 'function') refreshPosts();
    if (typeof renderHome === 'function') renderHome(true);
    if (typeof renderList === 'function') renderList(true);
    if (typeof renderPost === 'function') renderPost(true);

    const setPH = (id, key) => {
      const el = document.getElementById(id);
      if (el && typeof Lang !== 'undefined') el.placeholder = Lang.t(key);
    };
    setPH('searchInput', 'search_ph');           // blog.html
    setPH('fullname', 'contact_fullname_ph');    // contact.html
    setPH('email', 'contact_email_ph');
    setPH('org', 'contact_org_ph');
    setPH('subject', 'contact_subject_ph');
    setPH('message', 'contact_message_ph');
  };

  if (typeof Lang !== 'undefined') {
    const current = Lang.get();
    applyLang(current);
  }

  if (hasSwitch) {
    frBtn.addEventListener('click', () => applyLang('fr'));
    enBtn.addEventListener('click', () => applyLang('en'));
  }
});
