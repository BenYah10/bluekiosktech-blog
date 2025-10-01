let getStore; try { ({ getStore } = require("@netlify/blobs")); } catch {}

exports.handler = async () => {
  let store = null;
  try { store = getStore ? getStore({ name:"leads", consistency:"strong" }) : null; } catch {}
  if (!store) {
    const html = `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:24px;background:#0b1220;color:#e6eefc">
      <h1>Leads – Résumé</h1>
      <p>Le stockage <strong>Netlify Blobs</strong> n'est pas activé sur ce site.<br>
      Active-le dans <em>Netlify → Blobs</em> puis redeploie pour voir la synthèse ici.</p>
      <ul><li>Les emails d’envoi et le webhook SendGrid continuent de fonctionner.</li></ul>
    </body>`;
    return { statusCode: 200, headers:{ "Content-Type":"text/html; charset=utf-8" }, body: html };
  }

  // ... (la version complète qui liste les leads si Blobs est dispo)
  // Tu peux remettre ici la version que je t’ai donnée, inchangée.
  return { statusCode: 200, body: "OK (Blobs enabled) – Remets la version complète si tu veux l’UI)." };
};
