// netlify/functions/send-daily-digest.js
// Récap quotidien des soumissions Netlify Forms envoyé via SendGrid (sans Blobs).

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";

function env(name, fallback = "") { return (process.env[name] || fallback).trim(); }
function parseList(str) { return str.split(/[;,]+/).map(s => s.trim()).filter(Boolean); }
function escapeHtml(s = "") { return s.toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

exports.handler = async () => {
  const SG_KEY   = env("SENDGRID_API_KEY");
  const SITE_ID  = env("NETLIFY_SITE_ID");
  const API_TOKEN= env("NETLIFY_TOKEN"); // Personal access token Netlify
  if (!SG_KEY || !SITE_ID || !API_TOKEN) {
    console.error("Missing env. Need SENDGRID_API_KEY, NETLIFY_SITE_ID, NETLIFY_TOKEN.");
    return { statusCode: 500, body: "Missing env vars" };
  }

  const formName      = env("NETLIFY_FORM_NAME", "contact");
  const lookbackHours = parseInt(env("DIGEST_LOOKBACK_HOURS", "24"), 10);
  const toList        = parseList(env("DIGEST_TO", env("MAIL_TO_DEFAULT", "")));
  const fromEmail     = env("MAIL_FROM", "do-not-reply@bluekiosk.tech");
  const fromName      = env("MAIL_FROM_NAME", "BlueKioskTech Digest");
  const authHeader    = { Authorization: `Bearer ${API_TOKEN}` };

  // 1) retrouve l'ID du formulaire
  const formsRes = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/forms`, { headers: authHeader });
  if (!formsRes.ok) return { statusCode: 502, body: "Netlify API error (forms list)" };
  const forms = await formsRes.json();
  const form = forms.find(f => (f.name||"").toLowerCase() === formName.toLowerCase()) || forms[0];
  if (!form) return { statusCode: 404, body: "No forms found" };

  // 2) toutes les soumissions du form
  const subsRes = await fetch(`https://api.netlify.com/api/v1/forms/${form.id}/submissions?per_page=1000`, { headers: authHeader });
  if (!subsRes.ok) return { statusCode: 502, body: "Netlify API error (submissions)" };
  const subs = await subsRes.json();

  // 3) garde celles des dernières X heures
  const cutoff = Date.now() - lookbackHours * 3600 * 1000;
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

  if (rows.length === 0) return { statusCode: 200, body: "No submissions. Nothing to send." };

  // 4) tableau HTML
  const now   = new Date();
  const title = `Résumé des demandes (${rows.length}) — ${now.toLocaleString("fr-CA",{hour12:false})}`;
  const header = ["Date","Nom","Email","Organisation","Type","Sujet","Message"];
  const htmlTable = `
    <table style="width:100%;border-collapse:collapse;font-family:system-ui,Segoe UI,Roboto,sans-serif">
      <thead><tr>
        ${header.map(h=>`<th style="text-align:left;padding:8px 10px;border-bottom:1px solid #ddd;background:#f5f7fb">${escapeHtml(h)}</th>`).join("")}
      </tr></thead>
      <tbody>
        ${rows.map(r=>`
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${escapeHtml(r.created_at.replace("T"," ").replace("Z",""))}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${escapeHtml(r.Nom)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${escapeHtml(r.Email)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${escapeHtml(r.Organisation)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${escapeHtml(r.Type)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${escapeHtml(r.Sujet)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${escapeHtml((r.Message||"").slice(0,300))}${r.Message && r.Message.length>300 ? "…" : ""}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;

  const contentHtml = `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif">
    <h2 style="margin:0 0 10px">${escapeHtml(title)}</h2>
    <p style="color:#3a4a66;margin:0 0 12px">Fenêtre: ${lookbackHours}h • Formulaire: ${escapeHtml(formName)}</p>
    ${htmlTable}
  </div>`;

  const payload = {
    personalizations: [{ to: toList.map(email => ({ email })) }],
    from: { email: fromEmail, name: fromName },
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
  if (!sgRes.ok) return { statusCode: 502, body: "SendGrid digest error" };

  return { statusCode: 200, body: `Digest sent: ${rows.length} rows` };
};
