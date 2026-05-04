// notify-hr-lead — Auth-gated Onboarding Lead Notification (HelloTalent Asama 84)
//
// MAJOR REFACTOR (25 Nisan 2026):
//   ESKI (Asama 83): public form -> hr_leads insert -> Tuna email
//   YENI (Asama 84): client signup -> hr_profiles insert (auth.signUp + INSERT)
//                    -> bu Edge Function client'tan { user_id } alir
//                    -> service_role ile hr_profiles oku
//                    -> Tuna'ya signup notification email
//                    -> Wizard tamamlandiginda ayri "completion" notification
//
// Endpoint kullanim:
//   POST /functions/v1/notify-hr-lead
//   Body:
//     { event: "signup",     user_id: "<uuid>" }   -- email confirm sonrasi
//     { event: "completion", user_id: "<uuid>" }   -- wizard step 8 sonrasi
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, SALES_EMAIL, EMAIL_FROM

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SALES_EMAIL = Deno.env.get("SALES_EMAIL") || "kefelituna@gmail.com";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "HelloTalent Sales <noreply@hellotalent.ai>";

type EventKind = "signup" | "completion";

interface NotifyPayload {
  event: EventKind;
  user_id: string;
}

interface HrProfileRow {
  id: string;
  email: string | null;
  ad: string | null;
  soyad: string | null;
  sirket: string | null;
  company_name: string | null;
  phone: string | null;
  segment_type: string | null;
  team_size: string | null;
  monthly_positions: string | null;
  urgency: string | null;
  brands: unknown;
  position_types: unknown;
  marketing_opt_in: boolean | null;
  onboarding_step: number | null;
  onboarding_completed: boolean | null;
  onboarding_completed_at: string | null;
  created_at: string | null;
}

const SEGMENT_LABELS: Record<string, string> = {
  single_brand: "Tek marka",
  holding: "Holding / çoklu marka",
  distributor: "Dağıtıcı / TR operatörü",
  headhunter: "Headhunter / ajans",
};

const URGENCY_LABELS: Record<string, string> = {
  hemen: "🔥 HEMEN",
  "1_ay": "1 ay içinde",
  "3_ay": "3 ay içinde",
  kesif: "Sadece keşif",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validate(p: unknown): { ok: true; value: NotifyPayload } | { ok: false; error: string } {
  if (!p || typeof p !== "object") return { ok: false, error: "payload must be object" };
  const o = p as Record<string, unknown>;
  if (typeof o.event !== "string" || (o.event !== "signup" && o.event !== "completion")) {
    return { ok: false, error: "invalid event" };
  }
  if (typeof o.user_id !== "string" || !UUID_RE.test(o.user_id)) {
    return { ok: false, error: "invalid user_id" };
  }
  return { ok: true, value: { event: o.event as EventKind, user_id: o.user_id } };
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "—";
  const m: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(s).replace(/[&<>"']/g, (c) => m[c]);
}

function isHotLead(p: HrProfileRow): boolean {
  return p.urgency === "hemen" && (p.team_size === "21-50" || p.team_size === "50+");
}

function fullName(p: HrProfileRow): string {
  const parts = [p.ad, p.soyad].filter(Boolean).join(" ").trim();
  return parts || "—";
}

function companyName(p: HrProfileRow): string {
  return p.company_name || p.sirket || "—";
}

function renderEmail(event: EventKind, p: HrProfileRow): { subject: string; html: string; text: string } {
  const company = companyName(p);
  const name = fullName(p);
  const email = p.email || "—";
  const hot = isHotLead(p);

  let subject: string;
  let banner = "";

  if (event === "signup") {
    subject = `Yeni kurumsal kayıt — ${company} (${name})`;
    banner =
      '<div style="background:#EEF2FF;border:1px solid #1E2D5E;color:#1E2D5E;padding:8px 12px;border-radius:6px;margin-bottom:16px;font-weight:600;">Yeni kayıt — onboarding wizard başladı</div>';
  } else {
    subject = hot
      ? `🔥 HOT — Kurumsal onboarding tamam — ${company}`
      : `Kurumsal onboarding tamamlandı — ${company} (${name})`;
    if (hot) {
      banner =
        '<div style="background:#FEF3C7;border:1px solid #F59E0B;color:#92400E;padding:8px 12px;border-radius:6px;margin-bottom:16px;font-weight:600;">🔥 HOT LEAD — Acil aksiyon önerilir</div>';
    } else {
      banner =
        '<div style="background:#ECFDF5;border:1px solid #10B981;color:#065F46;padding:8px 12px;border-radius:6px;margin-bottom:16px;font-weight:600;">Onboarding tamamlandı — sales dönüşü</div>';
    }
  }

  const segmentLabel = p.segment_type ? SEGMENT_LABELS[p.segment_type] || p.segment_type : "—";
  const urgencyLabel = p.urgency ? URGENCY_LABELS[p.urgency] || p.urgency : "—";

  const brandsHtml = (p.brands && Array.isArray(p.brands) && p.brands.length > 0)
    ? `<code>${escapeHtml(JSON.stringify(p.brands))}</code>`
    : "—";
  const positionsHtml = (p.position_types && Array.isArray(p.position_types) && p.position_types.length > 0)
    ? `<code>${escapeHtml(JSON.stringify(p.position_types))}</code>`
    : "—";

  const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family:-apple-system,system-ui,sans-serif;color:#1E2D5E;background:#F7F6F4;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E2DD;border-radius:12px;padding:32px;">
    ${banner}
    <h1 style="font-family:'Bricolage Grotesque',serif;font-size:22px;margin:0 0 4px;">${escapeHtml(company)}</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;">${escapeHtml(name)} · ${escapeHtml(email)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#6B7280;width:40%;">Telefon</td><td style="padding:8px 0;font-weight:500;">${escapeHtml(p.phone)}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Şirket türü</td><td style="padding:8px 0;font-weight:500;">${escapeHtml(segmentLabel)}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Ekip büyüklüğü</td><td style="padding:8px 0;font-weight:500;">${escapeHtml(p.team_size)}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Aylık açık pozisyon</td><td style="padding:8px 0;font-weight:500;">${escapeHtml(p.monthly_positions)}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Aciliyet</td><td style="padding:8px 0;font-weight:500;">${escapeHtml(urgencyLabel)}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Markalar</td><td style="padding:8px 0;">${brandsHtml}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Aranan pozisyonlar</td><td style="padding:8px 0;">${positionsHtml}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Pazarlama onayı</td><td style="padding:8px 0;font-weight:500;">${p.marketing_opt_in ? "✓ Evet" : "✗ Hayır"}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Wizard adım</td><td style="padding:8px 0;font-weight:500;">${escapeHtml(String(p.onboarding_step ?? "—"))} / 8</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Onboarding</td><td style="padding:8px 0;font-weight:500;">${p.onboarding_completed ? "✓ Tamamlandı" : "Devam ediyor"}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Kayıt tarihi</td><td style="padding:8px 0;font-weight:500;">${escapeHtml(p.created_at)}</td></tr>
    </table>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E5E2DD;">
      <p style="margin:0 0 8px;font-size:13px;color:#6B7280;">Admin paneli:</p>
      <code style="font-size:12px;color:#1E2D5E;word-break:break-all;">https://hellotalent.ai/admin.html#leads</code>
    </div>
    <p style="margin-top:24px;color:#6B7280;font-size:12px;">
      User ID: <code>${escapeHtml(p.id)}</code><br>
      HelloTalent Sales · Asama 84 (auth-gated onboarding)
    </p>
  </div>
</body>
</html>`;

  const text = `${event === "signup" ? "Yeni kayıt" : "Onboarding tamamlandı"}${hot ? " 🔥 HOT" : ""}
${company} — ${name}
Email: ${email}
Telefon: ${p.phone || "—"}
Şirket türü: ${segmentLabel}
Ekip: ${p.team_size || "—"}
Aylık açık pozisyon: ${p.monthly_positions || "—"}
Aciliyet: ${urgencyLabel}
Wizard adım: ${p.onboarding_step ?? "—"} / 8
Onboarding tamam: ${p.onboarding_completed ? "✓" : "—"}
User ID: ${p.id}
Admin: https://hellotalent.ai/admin.html#leads`;

  return { subject, html, text };
}

async function sendEmail(event: EventKind, p: HrProfileRow): Promise<void> {
  const { subject, html, text } = renderEmail(event, p);
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [SALES_EMAIL],
      reply_to: p.email || undefined,
      subject,
      html,
      text,
      tags: [
        { name: "category", value: "hr_signup" },
        { name: "event", value: event },
        { name: "hot", value: isHotLead(p) ? "true" : "false" },
        { name: "segment", value: p.segment_type || "unknown" },
      ],
    }),
  });
  if (!resp.ok) {
    const errBody = await resp.text();
    console.error("Resend error:", resp.status, errBody);
    throw new Error(`Resend delivery failed: ${resp.status}`);
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Client-Info",
  "Access-Control-Max-Age": "86400",
};

// A23 Codex BLOCKER fix (2026-05-04): JWT verify + sub == user_id eşleşmesi.
// Eski: anon key + body.user_id trust → spoof riski (anyone POST /functions/v1/notify-hr-lead).
// Yeni: caller'ın access_token JWT'sinden `sub` çıkar, body.user_id ile karşılaştır.
async function verifyAuthHeader(
  req: Request,
  expectedUserId: string,
): Promise<{ ok: true } | { ok: false; status: number; reason: string }> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, reason: "missing_bearer" };
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, reason: "empty_bearer" };
  }
  // service_role context (system trigger): tek istisna, ama yine de yasak.
  // notify-hr-lead client'tan çağrılır → user JWT zorunlu.

  // Auth client (anon) ile getUser(token) çağır → JWT verify Supabase tarafında.
  const authClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, reason: "invalid_jwt" };
  }
  if (data.user.id !== expectedUserId) {
    return { ok: false, status: 403, reason: "user_id_mismatch" };
  }
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const validation = validate(body);
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    }
    const { event, user_id } = validation.value;

    /* A23 Codex BLOCKER (2026-05-04): JWT verify + sub eşleşmesi. */
    const authCheck = await verifyAuthHeader(req, user_id);
    if (!authCheck.ok) {
      console.warn("notify-hr-lead auth fail:", authCheck.reason);
      return new Response(
        JSON.stringify({ error: "unauthorized" }),
        { status: authCheck.status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: row, error: fetchErr } = await supabase
      .from("hr_profiles")
      .select(
        "id, email, ad, soyad, sirket, company_name, phone, segment_type, team_size, monthly_positions, urgency, brands, position_types, marketing_opt_in, onboarding_step, onboarding_completed, onboarding_completed_at, created_at",
      )
      .eq("id", user_id)
      .maybeSingle();

    if (fetchErr) {
      console.error("hr_profiles fetch error:", fetchErr.message);
      return new Response(
        JSON.stringify({ error: "lookup_failed" }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    }
    if (!row) {
      return new Response(
        JSON.stringify({ error: "profile_not_found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    }

    let emailStatus: "sent" | "failed" = "sent";
    try {
      await sendEmail(event, row as HrProfileRow);
    } catch (emailErr) {
      console.error("email send failed:", (emailErr as Error).message);
      emailStatus = "failed";
    }

    return new Response(
      JSON.stringify({
        ok: true,
        event,
        user_id,
        hot: isHotLead(row as HrProfileRow),
        email_status: emailStatus,
      }),
      { headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
    );
  } catch (err) {
    console.error("notify-hr-lead error:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: "internal" }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
    );
  }
});
