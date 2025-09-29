// assets/js/privacy.js — i18n locale (privacy) + synchro switch global
(() => {
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Dictionnaire local (identique au tien)
  const i18nPriv = {
    fr: {
      title: "Politique de confidentialité",
      updated: "Dernière mise à jour : 5 sept. 2025",
      intro:
        'Chez <strong>Bluekiosktech.blog</strong>, nous accordons une grande importance à la protection de vos données personnelles. Cette politique explique quelles informations nous collectons, comment nous les utilisons, combien de temps nous les conservons et quels sont vos droits.',
      "controller.title": "1. Responsable du traitement",
      "controller.body":
        'Le responsable du traitement est : <strong>BlueKioskTech</strong>.<br/>Contact : <a href="mailto:admin@bluekiosk.tech">admin@bluekiosk.tech</a>',
      "data.title": "2. Données collectées",
      "data.li1": "Réponses aux formulaires (contact / liste d’attente) et feedback.",
      "data.li2": "Adresse e-mail (optionnelle).",
      "data.li3": "Métadonnées techniques minimales (ex. journaux d’accès côté hébergeur).",
      "data.li4": "Préférence de langue (stockée localement sur votre appareil).",
      "data.note": "Nous ne collectons que les données que vous nous fournissez volontairement.",
      "usage.title": "3. Finalités d’utilisation",
      "usage.li1": "Gérer la liste d’attente et vous contacter lors du lancement.",
      "usage.li2": "Analyser vos retours pour améliorer nos services et produits.",
      "usage.li3": "Mesurer l’intérêt (statistiques agrégées/anonymisées).",
      "basis.title": "4. Base légale",
      "basis.li1": "Votre consentement (opt-in volontaire, feedback).",
      "basis.li2": "Intérêt légitime (sécurité, prévention des abus).",
      "share.title": "5. Sous-traitants & hébergement",
      "share.li1": "<strong>Hébergement :</strong> Vercel/Netlify (journaux d’accès standard).",
      "share.li2": "<strong>Envoi d’e-mails :</strong> SendGrid/EmailJS (selon la page de contact).",
      "share.li3": "<strong>Stockage :</strong> Google Workspace/Sheets (données de formulaire).",
      "share.note":
        "Ces prestataires traitent les données pour notre compte et selon nos instructions, avec des garanties de sécurité appropriées.",
      "retention.title": "6. Durée de conservation",
      "retention.body":
        "Nous conservons vos données jusqu’à 24 mois après la collecte, sauf demande de suppression antérieure ou obligation légale différente.",
      "rights.title": "7. Vos droits",
      "rights.li1": "Accès, rectification, effacement.",
      "rights.li2": "Retrait du consentement à tout moment.",
      "rights.li3": "Limitation/opposition (selon votre juridiction).",
      "rights.li4": "Plainte auprès de votre autorité de protection des données.",
      "rights.note":
        'Pour exercer vos droits : <a href="mailto:admin@bluekiosk.tech">admin@bluekiosk.tech</a>',
      "contact.title": "8. Contact",
      "contact.body":
        'Pour toute question relative à cette politique : <a href="mailto:admin@bluekiosk.tech">admin@bluekiosk.tech</a>.',
      disclaimer:
        "Cette politique peut être mise à jour. La date en tête de page indique la dernière révision."
    },
    en: {
      title: "Privacy Policy",
      updated: "Last updated: Sep 5, 2025",
      intro:
        "At <strong>Bluekiosktech.blog</strong>, we care about protecting your personal data. This policy explains what we collect, how we use it, how long we keep it, and your rights.",
      "controller.title": "1. Data Controller",
      "controller.body":
        'Data controller: <strong>BlueKioskTech</strong>.<br/>Contact: <a href="mailto:admin@bluekiosk.tech">admin@bluekiosk.tech</a>',
      "data.title": "2. Data we collect",
      "data.li1": "Form responses (contact / waitlist) and feedback.",
      "data.li2": "Email address (optional).",
      "data.li3": "Minimal technical metadata (e.g., host access logs).",
      "data.li4": "Language preference (stored locally on your device).",
      "data.note": "We only collect data you voluntarily provide to us.",
      "usage.title": "3. Purposes of use",
      "usage.li1": "Manage the waitlist and contact you at launch.",
      "usage.li2": "Analyze feedback to improve our services and products.",
      "usage.li3": "Measure interest (aggregated/anonymous stats).",
      "basis.title": "4. Legal basis",
      "basis.li1": "Your consent (voluntary opt-in, feedback).",
      "basis.li2": "Legitimate interest (security, abuse prevention).",
      "share.title": "5. Sub-processors & hosting",
      "share.li1": "<strong>Hosting:</strong> Vercel/Netlify (standard access logs).",
      "share.li2": "<strong>Email sending:</strong> SendGrid/EmailJS (depending on the contact page).",
      "share.li3": "<strong>Storage:</strong> Google Workspace/Sheets (form data).",
      "share.note":
        "These providers process data on our behalf under our instructions, with appropriate safeguards.",
      "retention.title": "6. Retention",
      "retention.body":
        "We keep your data for up to 24 months after collection unless you request deletion earlier or a different legal retention applies.",
      "rights.title": "7. Your rights",
      "rights.li1": "Access, rectification, erasure.",
      "rights.li2": "Withdraw consent at any time.",
      "rights.li3": "Restriction/objection (where applicable).",
      "rights.li4": "Complaint to your data protection authority.",
      "rights.note":
        'To exercise your rights: <a href="mailto:admin@bluekiosk.tech">admin@bluekiosk.tech</a>',
      "contact.title": "8. Contact",
      "contact.body":
        'For any question regarding this policy: <a href="mailto:admin@bluekiosk.tech">admin@bluekiosk.tech</a>.',
      disclaimer:
        "We may update this policy. The date at the top indicates the last revision."
    }
  };

  function applyPriv(lang) {
    // 1) Texte simple
    $$("[data-priv]").forEach((el) => {
      const k = el.getAttribute("data-priv");
      const v = i18nPriv?.[lang]?.[k];
      if (typeof v === "string") el.textContent = v;
    });
    // 2) Texte riche (HTML)
    $$("[data-priv-html]").forEach((el) => {
      const k = el.getAttribute("data-priv-html");
      const v = i18nPriv?.[lang]?.[k];
      if (typeof v === "string") el.innerHTML = v;
    });

    // 3) <html lang>, <title>, meta description
    document.documentElement.lang = lang;
    try {
      const t = i18nPriv?.[lang]?.title || "Privacy";
      document.title = `${t} — Bluekiosktech.blog`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute(
          "content",
          lang === "en"
            ? "How we collect, use and protect your data on Bluekiosktech.blog."
            : "Comment nous collectons, utilisons et protégeons vos données sur Bluekiosktech.blog."
        );
      }
    } catch (_) {}
  }

  function getLang() {
    try {
      if (typeof Lang !== "undefined" && typeof Lang.get === "function") return Lang.get();
      const l = (localStorage.getItem("lang") || navigator.language || "fr").toLowerCase();
      return l.startsWith("en") ? "en" : "fr";
    } catch {
      return "fr";
    }
  }

  function setYear() {
    const y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
  }

  // --- Initialisation & écouteurs
  document.addEventListener("DOMContentLoaded", () => {
    // 0) Applique la nav/footer globale (data-i18n)
    if (typeof applyI18N === "function") applyI18N();

    // 1) Applique le contenu de privacy (data-priv / data-priv-html)
    const lang = getLang();
    applyPriv(lang);
    setYear();

    // 2) Switch FR/EN (boutons header)
    const frBtn = $("#lang-fr");
    const enBtn = $("#lang-en");
    const switchTo = (code) => {
      if (typeof Lang !== "undefined" && typeof Lang.set === "function") Lang.set(code);
      localStorage.setItem("lang", code);
      // Réappliquer global + local (dans cet ordre)
      if (typeof applyI18N === "function") applyI18N();
      applyPriv(code);
    };
    if (frBtn) frBtn.addEventListener("click", () => switchTo("fr"));
    if (enBtn) enBtn.addEventListener("click", () => switchTo("en"));

    // 3) Synchronisation inter-onglets (au cas où)
    window.addEventListener("storage", (e) => {
      if (e.key === "lang" && (e.newValue === "fr" || e.newValue === "en")) {
        if (typeof applyI18N === "function") applyI18N();
        applyPriv(e.newValue);
      }
    });
  });
})();
