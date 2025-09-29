/* ============================================================
   Bluekiosktech — data.js (bilingue FR/EN)
   - Deux tableaux d’articles : POSTS_FR et POSTS_EN
   - Expose getPosts() et refreshPosts() en globals
   - Maintient window.POSTS pour compatibilité avec render.js
   ============================================================ */

/* --- Articles FR --- */
const POSTS_FR = [
  /* ───────────── Article #3 — Check-list d’implantation (NOUVEAU) ───────────── */
  {
    id: "checklist-implantation-gym", order: 3, 
    title: "📋 Check-list d’implantation en salle : flux, emplacements, adoption",
    description:
      "Intégrer BlueKioskTech de façon fluide : flux utilisateurs, emplacements types (gyms, bureaux, campus), signalétique et plan de lancement。",
    excerpt:
      "Réussir l’implantation, c’est penser flux, contexte spatial et signalétique. Emplacements recommandés (gyms, bureaux, campus) et plan de lancement en 2 semaines pour maximiser l’adoption.",
    date: "2025-09-23",
    category: "ops",
    readTime: 8,
    views: 0,
    content: `
<h2>Pourquoi une check-list ?</h2>
<p>
Réussir l’implantation d’une solution d’hygiène comme BlueKioskTech, c’est d’abord penser <strong>flux utilisateurs</strong>, <strong>contexte spatial</strong> et <strong>signalétique</strong>.
Notre approche consiste à intégrer la machine de manière <em>fluide et intuitive</em> dans les environnements publics et professionnels pour <strong>maximiser l’adoption</strong> et l’impact.
</p>

<h2>🧭 Emplacements recommandés</h2>
<h3>Dans les gyms</h3>
<ul>
  <li><strong>Vestiaires & zones de transition</strong> — avant/après l’activité, pour inciter à la désinfection des gourdes et accessoires.</li>
  <li><strong>Entrées principales / halls</strong> — visibilité maximale et ancrage d’une routine d’hygiène dès l’arrivée.</li>
  <li><strong>Zones cardio & musculation</strong> — là où les gourdes circulent le plus.</li>
  <li><strong>Fontaines & points d’eau</strong> — compléter le remplissage par le geste de désinfection.</li>
</ul>

<h3>Dans les bureaux & espaces professionnels</h3>
<ul>
  <li><strong>Entrées & halls d’accueil</strong> — visibilité auprès des collaborateurs et visiteurs, réflexe dès l’arrivée.</li>
  <li><strong>Cafétérias / cuisines partagées</strong> — les gourdes sont remplies ici, mais rarement désinfectées ; proposer un geste rapide <em>sans chimie</em>.</li>
  <li><strong>Zones de pause / coworking</strong> — lieux informels à forte fréquentation où la machine demeure discrète mais accessible.</li>
  <li><strong>À proximité des fontaines / distributeurs</strong> — encourager le réflexe immédiat après le remplissage.</li>
</ul>

<h3>🎓 Campus & universités</h3>
<ul>
  <li><strong>Entrées des bibliothèques / salles d’étude</strong> — encourager l’hygiène sans perturber le rythme de travail.</li>
  <li><strong>Zones sportives</strong> (gymnases, terrains, vestiaires) — désinfection avant/après l’activité physique.</li>
  <li><strong>Cafétérias & espaces de vie</strong> — lieux de forte circulation des gourdes ; la machine devient un outil de prévention collective.</li>
  <li><strong>Résidences étudiantes / halls</strong> — accès facile à l’hygiène, indépendamment des routines personnelles.</li>
</ul>

<h2>🚀 Plan de lancement simplifié (2 semaines)</h2>
<ol>
  <li><strong>Analyse</strong> des flux et usages spécifiques à votre espace.</li>
  <li><strong>Recommandations</strong> d’emplacement adaptées à votre configuration.</li>
  <li><strong>Kit de signalétique</strong> pour sensibiliser et guider les utilisateurs.</li>
  <li><strong>Suivi d’utilisation</strong> simple pour mesurer l’impact et ajuster si besoin.</li>
</ol>

<h2>🤝 Devenez site pilote</h2>
<p>
Vous gérez un gym, un campus, un espace de coworking ou des bureaux d’entreprise ?
Rejoignez notre programme pilote et testez BlueKioskTech en avant-première : une <strong>désinfection en &lt; 2 minutes</strong>, <strong>sans produit chimique</strong>.
</p>
<p><a href="contact.html" class="btn primary">🔵 Rejoindre la liste d’attente</a></p>
    `
  },

  /* ───────────── Article #1 — Immunité & hygiène ───────────── */
  {
    id: "immunite-collective-hygiene", order: 1, 
    title:
      "🧬 Se sentir en bonne santé ne suffit pas : notre immunité est unique… et notre responsabilité collective.",
    description:
      "Pourquoi l’hygiène est un geste pour soi et pour les autres : variabilité immunitaire (Institut Pasteur) et implications au quotidien.",
    excerpt:
      "Même en forme, nous pouvons transmettre des microbes à des personnes plus vulnérables. L’Institut Pasteur montre que l’immunité varie (âge, sexe, génétique, microbiote, historique) — d’où l’importance d’une hygiène collective et intelligente.",
    date: "2025-09-25",
    category: "hygiene",
    readTime: 7,
    views: 0,
    content: `
<h2>Se sentir en bonne santé ne suffit pas</h2>
<p>
Beaucoup pensent que parce qu’ils se sentent bien, leur système immunitaire est forcément robuste. Pas de symptômes, pas de souci.
Mais même en bonne santé, nous pouvons <strong>transmettre des bactéries et des virus</strong> à des personnes dont l’immunité est plus fragile.
Dans les lieux publics, les gyms, les écoles ou les transports, nous sommes tous des <em>receveurs</em> et des <em>transmetteurs</em> potentiels.
C’est là que l’hygiène prend tout son sens : elle ne protège pas seulement soi-même, elle <strong>protège aussi les autres</strong>.
</p>

<h2>🔍 Ce qui influence vraiment notre système immunitaire — Institut Pasteur</h2>
<p>
L’Institut Pasteur (projet <em>Milieu Intérieur</em>) a étudié 1000 adultes en bonne santé pour comprendre pourquoi notre immunité varie autant d’une personne à l’autre.
Les principaux facteurs identifiés :
</p>
<ul>
  <li><strong>L’âge</strong> : certaines fonctions s’affaiblissent avec le temps, d’autres se renforcent.</li>
  <li><strong>Le sexe</strong> : les femmes présentent souvent une réponse immunitaire plus active.</li>
  <li><strong>Le patrimoine génétique</strong> : nos gènes modulent la reconnaissance et la lutte contre les microbes.</li>
  <li><strong>Le microbiote</strong> : les bactéries qui vivent en nous régulent une partie de l’immunité.</li>
  <li><strong>Les infections passées</strong> : l’historique infectieux façonne la réponse actuelle.</li>
</ul>
<p>
🎯 <strong>Objectif de l’étude</strong> : mieux comprendre cette diversité pour développer une <strong>médecine personnalisée</strong> — traitements et recommandations adaptés à chaque profil immunitaire.
</p>
<p class="meta">
🔗 Lire l’article sur le site de l’Institut Pasteur :
<a href="https://www.pasteur.fr" target="_blank" rel="noopener">pasteur.fr</a>
</p>

<h2>🧼 Ce que cela signifie pour l’hygiène au quotidien</h2>
<p>
Cette variabilité immunitaire nous rappelle une chose essentielle : <strong>nous ne sommes pas tous égaux face aux microbes</strong>.
Ce qui est bénin pour l’un peut être dangereux pour l’autre. Dans les espaces partagés, nos habitudes d’hygiène ont un impact direct sur la santé des autres.
</p>
<p>
Chez BlueKioskTech, nous pensons que l’hygiène doit être <strong>intelligente, accessible et collective</strong>.
C’est pourquoi nous développons des solutions propres, comme notre machine <em>libre-service</em> capable de <strong>désinfecter une gourde et son bouchon en moins de 2 minutes, sans produit chimique</strong>.
Parce que l’immunité est personnelle… <strong>mais l’hygiène est universelle</strong>.
</p>
    `
  },

  /* ───────────── Article #2 — Gourdes & contamination ───────────── */
  {
    id: "hygiene-gourdes-99-2min", order: 2, 
    title:
      "🧴 Votre gourde est un nid à bactéries : Le saviez-vous, votre gourde peut être jusqu'à 40 000 fois plus sale qu'un siège de toilette 🚽?",
    description:
      "Le point sur les risques invisibles et la désinfection 99,99% en self-service.",
    excerpt:
      "Gourdes réutilisables : chaleur, humidité et résidus créent un terrain idéal pour les microbes. Pourquoi le rinçage ne suffit pas et comment un cycle 99,99% en < 2 min réduit le risque.",
    date: "2024-09-24",
    category: "hygiene",
    readTime: 8,
    views: 0,
    content: `
<h2>Résumé (≈150 mots)</h2>
<p>
Les gourdes réutilisables sont formidables pour l’environnement… mais la chaleur, l’humidité et les résidus organiques en font un terrain idéal pour les bactéries.
Une étude citée par <em>WaterFilterGuru</em> montre que certaines gourdes peuvent héberger jusqu’à <strong>40 000× plus de bactéries qu’un siège de toilette</strong> —
avec des niveaux particulièrement élevés sur les bouchons à vis et à bec. Des souches telles que les bacilles et des bactéries gram-négatives peuvent être impliquées
dans des infections gastro-intestinales ou respiratoires. Le simple rinçage au robinet est insuffisant et le nettoyage maison est irrégulier :
près de 15 % des utilisateurs ne nettoient leur gourde que quelques fois par mois. Cet article explique <strong>pourquoi</strong> la contamination survient,
<strong>quels micro-organismes</strong> sont en jeu, et <strong>comment</strong> un cycle de désinfection <strong>99,99 %</strong> en
<strong>&lt; 2 minutes</strong> peut réduire fortement le risque au quotidien.
</p>

<p class="meta">
👉 Source : <a href="https://waterfilterguru.com/swabbing-water-bottles/" target="_blank" rel="noopener">WaterFilterGuru – Swabbing Water Bottles</a>
</p>

<h2>Pourquoi autant de bactéries ?</h2>
<ul>
  <li><strong>Chaleur & humidité</strong> : un duo favorable à la croissance microbienne.</li>
  <li><strong>Résidus organiques</strong> (salive, sucres, protéines) : « nourriture » pour les bactéries.</li>
  <li><strong>Contact bouche → bouteille</strong> : introduction directe de pathogènes potentiels.</li>
  <li><strong>Bouchons & filetages</strong> : zones complexes, souvent les plus contaminées et mal nettoyées.</li>
</ul>

<h2>Pourquoi le rinçage ne suffit pas ?</h2>
<p>
Le rinçage élimine les débris visibles, mais <strong>n’inactive pas</strong> les micro-organismes adhérents (biofilm) ni ceux nichés dans les zones critiques
(filetage, sous le bec, intérieur du bouchon). Une désinfection <em>complète, reproductible et validée</em> est nécessaire pour ramener la charge microbienne à un niveau sûr.
</p>

<h2>La réponse BlueKioskTech : technologie VUCS</h2>
<p>
BlueKioskTech a développé une machine <strong>self-service</strong> qui désinfecte le corps de la gourde <em>et</em> son bouchon en <strong>&lt; 2 minutes</strong>,
<strong>sans chimie</strong>, grâce à une combinaison brevetée et coordonnée de trois phases — <strong>VUCS</strong> — conçue pour atteindre une
<strong>efficacité 99,99 %</strong>.
</p>
<ul>
  <li>Ciblage des <strong>zones critiques</strong> : intérieur, bouchon, filetage.</li>
  <li><strong>Réduction fiable</strong> de la charge microbienne (log reduction).</li>
  <li>Expérience <strong>rapide</strong>, <strong>accessible</strong> et <strong>éco-responsable</strong> (sans consommables chimiques).</li>
</ul>

<h2>Hygiène, réinventée pour tous</h2>
<p>
En intégrant les données scientifiques récentes à une technologie propre, BlueKioskTech apporte une solution concrète à un risque invisible mais quotidien.
Parce que l’hygiène ne devrait pas être une contrainte : <strong>elle doit être intelligente, collective et exigeante</strong>.
</p>
    `
  },

  /* ───────────── Article #4 — Normes & certifications (placeholder) ───────────── */
  {
    id: "normes-certifications", order: 4, 
    title:
      "Normes & certifications : mesurer (vraiment) la désinfection 99,99%",
    description:
      "Fiabilité, conformité et protocole de test expliqués simplement.",
    excerpt:
      "Que signifie réellement 99,99 % ? Normes, protocoles, réduction log, conditions d’essai, reproductibilité et preuves d’adoption.",
    date: "2025-09-22",
    category: "produit",
    readTime: 9,
    views: 0,
    content: `
<p><strong>Résumé (180 mots).</strong> Que signifie 99,99 % ? Normes, protocoles, réduction log, conditions d’essai, reproductibilité et preuves d’adoption — pourquoi cela compte pour la fiabilité et l’adoption utilisateur.</p>
    `
  }
];

/* --- Articles EN --- */
const POSTS_EN = [
  /* ───────────── Article #3 — Rollout checklist (NEW) ───────────── */
  {
    id: "checklist-implantation-gym", order: 3, 
    title: "📋 Rollout checklist: flow, placement, adoption",
    description:
      "Seamless integration of BlueKioskTech: user flow, placement (gyms, offices, campuses), signage and a two-week launch plan.",
    excerpt_en:
      "Success starts with user flow, spatial context and signage. Recommended placements (gyms, offices, campuses) and a two-week rollout to maximize adoption.",
    date: "2025-09-23",
    category: "ops",
    readTime: 8,
    views: 0,
    content: `
<h2>Why a checklist?</h2>
<p>
Rolling out a hygiene solution like BlueKioskTech begins with <strong>user flow</strong>, <strong>spatial context</strong> and <strong>signage</strong>.
Our goal is to embed the unit <em>smoothly and intuitively</em> into public and professional environments to <strong>maximize adoption</strong> and impact.
</p>

<h2>🧭 Recommended placements</h2>
<h3>In gyms</h3>
<ul>
  <li><strong>Locker rooms & transition areas</strong> — before/after workouts to prompt disinfection of bottles and accessories.</li>
  <li><strong>Main entrances / lobbies</strong> — high visibility and a routine established on arrival.</li>
  <li><strong>Cardio & strength zones</strong> — where bottles are used most.</li>
  <li><strong>Fountains & water points</strong> — pair refilling with a quick disinfection step.</li>
</ul>

<h3>In offices & workplaces</h3>
<ul>
  <li><strong>Entrances & lobbies</strong> — visible to employees and visitors, establishing the habit early.</li>
  <li><strong>Cafeterias / shared kitchens</strong> — bottles are refilled here but rarely disinfected; provide a quick, <em>chemical-free</em> step.</li>
  <li><strong>Break areas / coworking spaces</strong> — informal, high-traffic locations where a discreet yet accessible unit reinforces hygiene culture.</li>
  <li><strong>Near fountains / dispensers</strong> — encourage an immediate post-refill reflex.</li>
</ul>

<h3>🎓 On campuses & universities</h3>
<ul>
  <li><strong>Library / study-hall entrances</strong> — support hygiene without disrupting study flow.</li>
  <li><strong>Sports facilities</strong> (gyms, fields, locker rooms) — disinfect before/after activity.</li>
  <li><strong>Cafeterias & student life areas</strong> — high bottle circulation; the unit becomes a collective prevention tool.</li>
  <li><strong>Student residences / common halls</strong> — easy access to hygiene regardless of personal routines.</li>
</ul>

<h2>🚀 Two-week launch plan</h2>
<ol>
  <li><strong>Assessment</strong> of traffic patterns and context-specific use.</li>
  <li><strong>Placement recommendations</strong> tailored to your layout.</li>
  <li><strong>Signage kit</strong> to inform and guide users.</li>
  <li><strong>Simple usage tracking</strong> to measure impact and iterate.</li>
</ol>

<h2>🤝 Become a pilot site</h2>
<p>
Manage a gym, campus, coworking space or corporate office? Join our pilot program and try BlueKioskTech early:
a <strong>&lt; 2-minute</strong>, <strong>chemical-free</strong> disinfection routine.
</p>
<p><a href="contact.html" class="btn primary">🔵 Join the waitlist</a></p>
    `
  },

  /* ───────────── Article #1 — Immunity & hygiene ───────────── */
  {
    id: "immunite-collective-hygiene", order: 1, 
    title:
      "🧬 Feeling healthy isn’t enough: immunity is personal… and hygiene is collective.",
    description:
      "Why hygiene is a responsibility to ourselves and others: immune variability (Institut Pasteur) and what it means in daily life.",
    excerpt_en:
      "Even when we feel fine, we can transmit microbes to more vulnerable people. Institut Pasteur shows immunity varies with age, sex, genetics, microbiota and infection history — hence the need for smart, collective hygiene.",
    date: "2025-09-25",
    category: "hygiene",
    readTime: 7,
    views: 0,
    content: `
<h2>Feeling healthy isn’t enough</h2>
<p>
Many people assume that if they feel fine, their immune system must be robust. No symptoms, no problem. In reality, even healthy individuals can
<strong>transmit bacteria and viruses</strong> to people with a more fragile immunity. In public places—gyms, schools, transit—we are all potential
<em>receivers</em> and <em>transmitters</em>. That’s why hygiene matters: it protects ourselves <strong>and</strong> it protects others.
</p>

<h2>🔍 What really shapes our immunity — Institut Pasteur</h2>
<p>
Institut Pasteur’s <em>Milieu Intérieur</em> project studied 1,000 healthy adults to understand why immunity varies so much between individuals.
Key factors include:
</p>
<ul>
  <li><strong>Age</strong>: some immune functions decline with time, others strengthen.</li>
  <li><strong>Sex</strong>: women often show more active immune responses than men.</li>
  <li><strong>Genetics</strong>: gene variants influence how we recognize and fight microbes.</li>
  <li><strong>Microbiota</strong>: resident bacteria help regulate immunity.</li>
  <li><strong>Past infections</strong>: our infection history shapes current responses.</li>
</ul>
<p>
🎯 <strong>Study goal</strong>: understand this diversity to enable <strong>personalized medicine</strong> — treatments and guidance tailored to each immune profile.
</p>
<p class="meta">
🔗 Read more on Institut Pasteur:
<a href="https://www.pasteur.fr/en" target="_blank" rel="noopener">pasteur.fr/en</a>
</p>

<h2>🧼 What this means for everyday hygiene</h2>
<p>
Immune variability reminds us: <strong>we are not all equally protected against microbes</strong>.
What is benign for one person may be risky for another. In shared spaces, our hygiene habits directly impact other people’s health.
</p>
<p>
At BlueKioskTech, we believe hygiene must be <strong>smart, accessible and collective</strong>.
That’s why we build clean-tech solutions like our <em>self-serve</em> machine that <strong>disinfects a bottle and its cap in under 2 minutes, without chemicals</strong>.
Immunity is personal… <strong>but hygiene is universal</strong>.
</p>
    `
  },

  /* ───────────── Article #2 — Bottle contamination ───────────── */
  {
    id: "hygiene-gourdes-99-2min", order: 2,
    title:
      "🧴 Your bottle is a bacteria nest: Did you know your water bottle can be up to 40,000 times dirtier than a toilet  🚽?",
    description:
      "Risks you don’t see and 99.99% self-serve disinfection explained.",
    excerpt_en:
      "Reusable bottles: heat, humidity and residues fuel microbial growth. Why rinsing isn’t enough — and how a 99.99% cycle in < 2 min reduces risk.",
    date: "2025-09-24",
    category: "hygiene",
    readTime: 8,
    views: 0,
    content: `
<h2>Summary (~150 words)</h2>
<p>
Reusable bottles are great for the planet, but warmth, moisture and organic residues make them a perfect breeding ground for microbes.
A study reported by <em>WaterFilterGuru</em> shows that some reusable bottles can host up to <strong>40,000× more bacteria than a toilet seat</strong> —
with the highest loads often found on screw and spout caps. Detected bacteria (bacilli, gram-negative, etc.) may be involved in gastrointestinal and respiratory infections.
Tap rinsing alone is insufficient, and home cleaning is irregular: nearly 15% of users clean their bottle only a few times per month.
This article explains <strong>why</strong> contamination happens, <strong>which microorganisms</strong> are involved, and <strong>how</strong> a
<strong>99.99% disinfection</strong> cycle in <strong>under 2 minutes</strong> can drastically reduce daily risks.
</p>

<p class="meta">
👉 Full source: <a href="https://waterfilterguru.com/swabbing-water-bottles/" target="_blank" rel="noopener">WaterFilterGuru – Swabbing Water Bottles</a>
</p>

<h2>Why so many bacteria?</h2>
<ul>
  <li><strong>Heat & humidity</strong>: ideal conditions for microbial growth.</li>
  <li><strong>Organic residues</strong> (saliva, sugars, proteins): food for bacteria.</li>
  <li><strong>Direct mouth contact</strong>: potential pathogens introduced into the bottle.</li>
  <li><strong>Caps & threads</strong>: complex areas, most contaminated and often poorly cleaned.</li>
</ul>

<h2>Why rinsing isn’t enough</h2>
<p>
Rinsing removes visible debris but <strong>doesn’t inactivate</strong> adherent microorganisms (biofilm) or those hiding in critical areas (threads, under the spout, inside the cap).
You need <em>complete, consistent and validated</em> disinfection to reduce microbial load to a safe level.
</p>

<h2>BlueKioskTech’s answer: VUCS technology</h2>
<p>
BlueKioskTech has developed a <strong>self-serve</strong> machine that disinfects both the bottle body <em>and</em> its cap in <strong>under 2 minutes</strong>,
<strong>without chemicals</strong>, using a patented, coordinated three-phase process — <strong>VUCS</strong> — engineered to deliver
<strong>99.99% efficacy</strong>.
</p>
<ul>
  <li>Targets <strong>critical zones</strong>: interior, cap, threading.</li>
  <li><strong>Reliably</strong> reduces microbial load (log reduction) with demonstrable results.</li>
  <li><strong>Fast</strong>, <strong>accessible</strong> and <strong>eco-conscious</strong> experience (no consumable chemicals).</li>
</ul>

<h2>Hygiene, reinvented for everyone</h2>
<p>
By integrating up-to-date scientific insights into clean-tech, BlueKioskTech provides a concrete answer to an invisible yet daily health challenge.
Because hygiene shouldn’t be a burden — it should be <strong>smart, collective and uncompromising</strong>.
</p>
    `
  },

  /* ───────────── Article #4 — Standards & certifications (placeholder) ───────────── */
  {
    id: "normes-certifications", order: 4, 
    title: "Standards & certifications: truly measuring 99.99% disinfection",
    description:
      "Reliability, compliance and test protocols made simple.",
    excerpt_en:
      "What does 99.99% really mean? Norms, test protocols, log reduction, conditions, reproducibility — and why adoption matters.",
    date: "2025-09-23",
    category: "produit",
    readTime: 9,
    views: 0,
    content: `
<p><strong>Summary (~180 words).</strong> What does “99.99%” actually mean? Norms, test protocols, log reduction, conditions and reproducibility, plus why adoption matters for reliability.</p>
    `
  }
];

/* --- Sélecteur de langue (utilise i18n.js si présent, sinon FR par défaut) --- */
function getLang() {
  try {
    if (typeof Lang !== "undefined" && typeof Lang.get === "function") return Lang.get();
    const guess = (navigator.language || "fr").toLowerCase();
    return guess.startsWith("en") ? "en" : "fr";
  } catch (e) {
    return "fr";
  }
}

/* --- API publique : renvoyer le bon tableau d’articles --- */
function getPosts() {
  return getLang() === "en" ? POSTS_EN : POSTS_FR;
}

/* --- Compatibilité : certaines pages attendent window.POSTS --- */
function refreshPosts() {
  window.POSTS = getPosts();
}

/* Expose en global */
window.getPosts = getPosts;
window.refreshPosts = refreshPosts;

/* Init immédiate */
refreshPosts();
