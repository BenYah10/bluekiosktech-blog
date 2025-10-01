// netlify/functions/send-daily-digest.js
// Envoie un email "digest" (tableau HTML) des soumissions Netlify Forms via SendGrid.
// Protégé par un secret (?s=TON_SECRET) pour éviter les exécutions publiques.

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";

/* ----------------------------- utils ----------------------------- */
const env = (k, d = "") => (process.env[k] ?? d).toString().trim();
const parseList = (s = "") => s.split(/[;,]+/).map(x => x.trim()).filter(Boolean);
const esc = (s = "") => s.toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

/* --------------------------- main handler ------------------------- */
exports.handler = async (event) => {
  /* --- Accès protégé ---
     - Autorise les exécutions planifiées Netlify (cron) via le header x-nf-schedule
     - Pour un appel manuel (URL), exige le secret: ?s=TON_SECRET
  */
  const isScheduled = !!event.headers?.["x-nf-schedule"];
  const SECRET = env("DIGEST_SECRET", "");
  // récupère le secret passé en query (?s=... ou ?token=...)
  const qs = event.queryStringParameters || {};
  const sFromQS = qs.s || qs.token;

  if (!isScheduled) {
    if (!SECRET || !sFromQS || sFromQS !== SECRET) {
      return { statusCode: 403, body: "Forbidden" };
    }
  }

  /* --- Env requis --- */
  const SG_KEY    = env("SENDGRID_API_KEY");
  const SITE_ID   = env("NETLIFY_SITE_ID");
  const API_TOKEN = env("NETLIFY_TOKEN"); // Personal Access Token Netlify (lecture des forms)
  if (!SG_KEY || !SITE_ID || !API_TOKEN) {
    console.error("Missing env vars: need SENDGRID_API_KEY, NETLIFY_SITE_ID, NETLIFY_TOKEN");
    return { statusCode: 500, body: "Missing env vars" };
  }

  /* --- Paramètres digest --- */
  const FORM_NAME        = env("NETLIFY_FORM_NAME", "contact");
  const LOOKBACK_HOURS   = parseInt(env("DIGEST_LOOKBACK_HOURS", "24"), 10);
  const TO_LIST          = parseList(env("DIGEST_TO", env("MAIL_TO_DEFAULT", "")));
  const FROM_EMAIL       = env("MAIL_FROM", "do-not-reply@bluekiosk.tech");
  const FROM_NAME        = env("MAIL_FROM_NAME", "BlueKioskTech Digest");

  if (TO_LIST.length === 0) {
    return { statusCode: 400, body: "Set DIGEST_TO (comma/semicolon-separated)" };
  }

  const netlifyAuth = { Authorization: `Bearer ${API_TOKEN}` };

  /* --- 1) Lister les formulaires, trouver l'ID du form ciblé --- */
  const formsRes = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/forms`, { headers: netlifyAuth });
  if (!formsRes.ok) return { statusCode: 502, body: "Netlify API error (forms list)" };
  const forms = await formsRes.json();
  const form = forms.find(f => (f.name || "").toLowerCase() === FORM_NAME.toLowerCase()) || forms[0];
  if (!form) return { statusCode: 404, body: "No forms found on the site" };

  /* --- 2) Récupérer les soumissions du form --- */
  const subsRes = await fetch(`https://api.netlify.com/api/v1/forms/${form.id}/submissions?per_page=1000`, { headers: netlifyAuth });
  if (!subsRes.ok) return { statusCode: 502, body: "Netlify API error (submissions)" };
  const subs = await subsRes.json();

  /* --- 3) Filtrer sur la fenêtre (X heures) & normaliser --- */
  const cutoff = Date.now() - LOOKBACK_HOURS * 3600 * 1000;
  const rows = subs
    .filter(s => new Date(s.created_at).getTime() >= cutoff)
    .map(s => {
      const d = s.data || {};
      return {
        created_at: s.created_at,
        Nom: d.Nom || d.name || d.fullname || "",
        Email: d.Email || d.email || "",
        Organisation: d.Organisation || d.org || "",
        Sujet: d.Sujet || d.subject || "",
        Type: (d.Type || "").toString(),
        Message: d.Message || d.message || ""
      };
    });

  if (rows.length === 0) {
    return { statusCode: 200, body: `No submissions in last ${LOOKBACK_HOURS}h. Nothing to send.` };
  }

  /* --- 4) Construire le tableau HTML --- */
  const now = new Date();
  const title = `Résumé des demandes (${rows.length}) — ${now.toLocaleString("fr-CA",{hour12:false})}`;
  const header = ["Date","Nom","Email","Organisation","Type","Sujet","Message"];

  const htmlTable = `
    <table style="width:100%;border-collapse:collapse;font-family:system-ui,Segoe UI,Roboto,sans-serif">
      <thead><tr>
        ${header.map(h=>`<th style="text-align:left;padding:8px 10px;border-bottom:1px solid #ddd;background:#f5f7fb">${esc(h)}</th>`).join("")}
      </tr></thead>
      <tbody>
        ${rows.map(r=>`
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(r.created_at.replace("T"," ").replace("Z",""))}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(r.Nom)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(r.Email)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(r.Organisation)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(r.Type)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(r.Sujet)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc((r.Message||"").slice(0,300))}${r.Message && r.Message.length>300 ? "…" : ""}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;

  const contentHtml = `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif">
    <h2 style="margin:0 0 10px">${esc(title)}</h2>
    <p style="color:#3a4a66;margin:0 0 12px">Fenêtre: ${LOOKBACK_HOURS}h • Formulaire: ${esc(FORM_NAME)}</p>
    ${htmlTable}
  </div>`;

  /* --- 5) Envoyer via SendGrid --- */
  const payload = {
    personalizations: [{ to: TO_LIST.map(email => ({ email })) }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: title,
    content: [
      { type: "text/plain", value: `Résumé des demandes (${rows.length}) - ${now.toISOString()}` },
      { type: "text/html",  value: contentHtml }
    ],
    categories: ["digest","bluekiosktech-blog"]
  };

  const sgRes = await fetch(SENDGRID_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${SG_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!sgRes.ok) {
    const txt = await sgRes.text().catch(()=> "");
    console.error("SendGrid error:", sgRes.status, txt);
    return { statusCode: 502, body: "SendGrid digest error" };
  }

  return { statusCode: 200, body: `Digest sent: ${rows.length} rows` };
};
