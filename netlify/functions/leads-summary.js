// netlify/functions/leads-summary.js
// Affiche une vue synthèse des leads stockés dans Netlify Blobs

const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  const store = getStore({ name: "leads", consistency: "strong" });

  // Récupération de toutes les clés "lead:*" (pagination)
  let cursor = undefined;
  const keys = [];
  do {
    const res = await store.list({ prefix: "lead:", cursor }).catch(() => ({ blobs: [], cursor: undefined }));
    (res.blobs || []).forEach(b => keys.push(b.key));
    cursor = res.cursor;
  } while (cursor);

  // Charge les leads
  const leads = [];
  for (const k of keys) {
    const x = await store.getJSON(k).catch(() => null);
    if (x) leads.push(x);
  }

  // Tri par date décroissante
  leads.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  // Agrégations
  const byType = {}, byStatus = {};
  for (const l of leads) {
    byType[l.type || ""] = (byType[l.type || ""] || 0) + 1;
    byStatus[l.status || "sent"] = (byStatus[l.status || "sent"] || 0) + 1;
  }

  // HTML
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Leads – Résumé</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Helvetica Neue',Arial,sans-serif;background:#0b1220;color:#e6eefc;margin:0;padding:24px}
    .wrap{max-width:1080px;margin:0 auto}
    h1{font-size:24px;margin:0 0 16px}
    .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:20px}
    .card{background:#121a2b;border:1px solid #1b2942;border-radius:12px;padding:14px}
    .k{font-size:12px;color:#9fb3ce;text-transform:uppercase;letter-spacing:.04em}
    .v{font-size:22px;font-weight:700}
    table{width:100%;border-collapse:collapse;background:#0f1726;border:1px solid #1b2942;border-radius:12px;overflow:hidden}
    th,td{padding:10px 12px;border-bottom:1px solid #1b2942;font-size:14px}
    th{background:#121a2b;text-align:left;color:#9fb3ce}
    tr:hover td{background:#12182a}
    .pill{padding:2px 8px;border-radius:999px;background:#1b2942;color:#cfe1ff;font-size:12px}
  </style>
</head>
<body><div class="wrap">
  <h1>Leads – Résumé</h1>

  <div class="grid">
    <div class="card"><div class="k">Total</div><div class="v">${leads.length}</div></div>
    ${Object.entries(byStatus).map(([k,v])=>`<div class="card"><div class="k">Status: ${k||'sent'}</div><div class="v">${v}</div></div>`).join("")}
    ${Object.entries(byType).map(([k,v])=>`<div class="card"><div class="k">Type: ${k||'—'}</div><div class="v">${v}</div></div>`).join("")}
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th><th>Nom</th><th>Email</th><th>Type</th><th>Sujet</th><th>À</th><th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${leads.slice(0,100).map(l=>`
        <tr>
          <td>${l.createdAt?.replace('T',' ').replace('Z','') || ''}</td>
          <td>${escape(l.fullName||'')}</td>
          <td>${escape(l.email||'')}</td>
          <td><span class="pill">${escape(l.type||'')}</span></td>
          <td>${escape(l.subject||'')}</td>
          <td>${escape(l.to||'')}</td>
          <td><span class="pill">${escape(l.status||'sent')}</span></td>
        </tr>`).join("")}
    </tbody>
  </table>

  <p style="margin-top:14px;color:#9fb3ce;font-size:12px">Affichage des 100 derniers leads. Données stockées via Netlify Blobs.</p>
</div></body></html>`;

  return { statusCode: 200, headers: { "Content-Type": "text/html; charset=utf-8" }, body: html };
};

function escape(s=""){return s.toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
