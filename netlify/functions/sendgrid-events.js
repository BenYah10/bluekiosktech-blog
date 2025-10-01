const crypto = require("crypto");
let getStore;
try { ({ getStore } = require("@netlify/blobs")); } catch {}

function buildPemFromBase64Spki(b64){const body=(b64||"").replace(/\s+/g,"");const w=body.replace(/(.{64})/g,"$1\n");return `-----BEGIN PUBLIC KEY-----\n${w}\n-----END PUBLIC KEY-----\n`;}
function tryGetLeadsStore(){ if(!getStore) return null; try{ return getStore({name:"leads", consistency:"strong"});}catch(e){ console.warn("Blobs disabled:", e.name||e.message); return null; } }

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const pubKeyB64 = process.env.SENDGRID_EVENT_PUBLIC_KEY || "";
    if (!pubKeyB64) return { statusCode: 500, body: "Server misconfigured" };
    const pubKeyPem = buildPemFromBase64Spki(pubKeyB64);

    const sig = event.headers["x-twilio-email-event-webhook-signature"];
    const ts  = event.headers["x-twilio-email-event-webhook-timestamp"];
    if (!sig || !ts) return { statusCode: 401, body: "unauthorized" };

    const raw = event.isBase64Encoded ? Buffer.from(event.body||"", "base64") : Buffer.from(event.body||"", "utf8");
    const verify = crypto.createVerify("sha256");
    verify.update(Buffer.from(ts,"utf8")); verify.update(raw); verify.end();
    if (!verify.verify(pubKeyPem, Buffer.from(sig,"base64"))) return { statusCode: 401, body: "invalid signature" };

    let items = []; try { items = JSON.parse(raw.toString("utf8") || "[]"); } catch {}
    const store = tryGetLeadsStore();

    for (const e of items) {
      console.log("sg_event", { event: e.event, email: e.email, sg_message_id: e.sg_message_id || e["sg_message_id"], timestamp: e.timestamp, category: e.category, custom_args: e.custom_args, reason: e.reason });
      if (!store) continue;
      const root = ((e.sg_message_id || e["sg_message_id"] || "")+"").split(".")[0];
      if (!root) continue;
      const map = await store.getJSON(`msg:${root}`).catch(()=>null);
      if (!map?.leadId) continue;
      const key = `lead:${map.leadId}`;
      const lead = (await store.getJSON(key).catch(()=>null)) || {};
      lead.status = e.event; lead.lastEvent = e.event;
      lead.lastUpdate = new Date((e.timestamp || Date.now()/1000)*1000).toISOString();
      if (e.reason) lead.reason = e.reason;
      await store.setJSON(key, lead);
    }
    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Webhook error:", err);
    return { statusCode: 400, body: "bad payload" };
  }
};
