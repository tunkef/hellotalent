// notify-hr-lead — Lead Capture + Tuna Notification (HelloTalent MVP 1)
//
// Flow:
//   1. POST request from public form (isveren-onboarding.html)
//   2. Validate input
//   3. Insert into hr_leads (service_role, bypasses RLS)
//   4. Send email to Tuna via Resend
//   5. Return demo_token for client redirect
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, SALES_EMAIL, EMAIL_FROM

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SALES_EMAIL = Deno.env.get("SALES_EMAIL") || "kefelituna@gmail.com";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "HelloTalent Sales <noreply@hellotalent.ai>";

interface LeadPayload {
  email: string;
  full_name: string;
  company_name: string;
  segment_type: "single_brand" | "holding" | "distributor" | "headhunter";
  team_size: "1" | "2-5" | "6-20" | "21-50" | "50+";
  monthly_positions: "1-3" | "4-10" | "11-30" | "30+";
  brands?: string[] | null;
  position_types?: string[] | null;
  urgency?: "hemen" | "1_ay" | "3_ay" | "kesif" | null;
  phone?: string | null;
  marketing_opt_in: boolean;
  responses?: Record<string, unknown>;
  user_agent?: string;
}

const SEGMENT_LABELS = {
  single_brand: "Tek marka",
  holding: "Holding / çoklu marka",
  distributor: "Dağıtıcı / TR operatörü",
  headhunter: "Headhunter / ajans",
} as const;

const URGENCY_LABELS: Record<string, string> = {
  hemen: "🔥 HEMEN",
  "1_ay": "1 ay içinde",
  "3_ay": "3 ay içinde",
  kesif: "Sadece keşif",
};

const VALID_SEGMENTS = new Set(Object.keys(SEGMENT_LABELS));
const VALID_TEAM_SIZE = new Set(["1", "2-5", "6-20", "21-50", "50+"]);
const VALID_MONTHLY = new Set(["1-3", "4-10", "11-30", "30+"]);
const VALID_URGENCY = new Set(["hemen", "1_ay", "3_ay", "kesif"]);

function validate(p: unknown): { ok: true; value: LeadPayload } | { ok: false; error: string } {
  if (!p || typeof p !== "object") return { ok: false, error: "payload must be object" };
  const o = p as Record<string, unknown>;
  if (typeof o.email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) return { ok: false, error: "invalid email" };
  if (typeof o.full_name !== "string" || o.full_name.length < 2 || o.full_name.length > 200) return { ok: false, error: "invalid full_name" };
  if (typeof o.company_name !== "string" || o.company_name.length < 1 || o.company_name.length > 200) return { ok: false, error: "invalid company_name" };
  if (typeof o.segment_type !== "string" || !VALID_SEGMENTS.has(o.segment_type)) return { ok: false, error: "invalid segment_type" };
  if (typeof o.team_size !== "string" || !VALID_TEAM_SIZE.has(o.team_size)) return { ok: false, error: "invalid team_size" };
  if (typeof o.monthly_positions !== "string" || !VALID_MONTHLY.has(o.monthly_positions)) return { ok: false, error: "invalid monthly_positions" };
  if (o.urgency != null && (typeof o.urgency !== "string" || !VALID_URGENCY.has(o.urgency))) return { ok: false, error: "invalid urgency" };
  if (o.phone != null && (typeof o.phone !== "string" || o.phone.length > 20)) return { ok: false, error: "invalid phone" };
  if (typeof o.marketing_opt_in !== "boolean") return { ok: false, error: "invalid marketing_opt_in" };
  if (o.brands != null && !Array.isArray(o.brands)) return { ok: false, error: "invalid brands" };
  if (o.position_types != null && !Array.isArray(o.position_types)) return { ok: false, error: "invalid position_types" };

  return {
    ok: true,
    value: {
      email: o.email,
      full_name: o.full_name,
      company_name: o.company_name,
      segment_type: o.segment_type as LeadPayload["segment_type"],
      team_size: o.team_size as LeadPayload["team_size"],
      monthly_positions: o.monthly_positions as LeadPayload["monthly_positions"],
      brands: (o.brands as string[]) || null,
      position_types: (o.position_types as string[]) || null,
      urgency: (o.urgency as LeadPayload["urgency"]) || null,
      phone: (o.phone as string) || null,
      marketing_opt_in: o.marketing_opt_in,
      responses: (o.responses as Record<string, unknown>) || {},
      user_agent: typeof o.user_agent === "string" ? o.user_agent.slice(0, 500) : "",
    },
  };
}

function isHotLead(p: LeadPayload): boolean {
  return p.urgency === "hemen" && (p.team_size === "21-50" || p.team_size === "50+");
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "—";
  const m: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(s).replace(/[&<>"']/g, (c) => m[c]);
}

interface InsertedRow {
  id: string;
  demo_token: string;
  created_at: string;
}

function renderEmail(p: LeadPayload, row: InsertedRow): { subject: string; html: string; text: string } {
  const hot = isHotLead(p);
  const subject = hot
    ? `🔥 HOT Lead — ${p.company_name} (${p.full_name})`
    : `Yeni İK Lead — ${p.company_name} (${p.full_name})`;

  const brandsHtml = (p.brands && p.brands.length > 0)
    ? `<code>${escapeHtml(JSON.stringify(p.brands))}</code>`
    : "—";
  const positionsHtml = (p.position_types && p.position_types.length > 0)
    ? `<code>${escapeHtml(JSON.stringify(p.position_types))}</code>`
    : "—";

  const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family:-apple-system,system-ui,sans-serif;color:#1E2D5E;background:#F7F6F4;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E2DD;border-radius:12px;padding:32px;">
    ${hot ? '<div style="background:#FEF3C7;border:1px solid #F59E0B;color:#92400E;padding:8px 12px;border-radius:6px;margin-bottom:16px;font-weight:600;">🔥 HOT LEAD — Acil aksiyon önerilir</div>' : ""}
    <h1 style="font-family:'Bricolage Grotesque',serif;font-size:22px;margin:0 0 4px;">${escapeHtml(p.company_name)}</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;">${escapeHtml(p.full_name)} · ${escapeHtml(p.email)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#6B7280;width:40%;">Şirket türü</td><td style="padding:8px 0;font-weight:500;">${escapeHtml(SEGMENT_LABELS[p.segment_type])}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Ekip büyüklüğü</td><td style="padding:8px 0;font-weight:500;">${escapeHtml(p.team_size)} kişi</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Aylık açık pozisyon</td><td style="padding:8px 0;font-weight:500;">${escapeHtml(p.monthly_positions)}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Aciliyet</td><td style="padding:8px 0;font-weight:500;">${escapeHtml(URGENCY_LABELS[p.urgency || ""] || "—")}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Telefon</td><td style="padding:8px 0;font-weight:500;">${escapeHtml(p.phone)}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Markalar</td><td style="padding:8px 0;">${brandsHtml}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Aranan pozisyonlar</td><td style="padding:8px 0;">${positionsHtml}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Pazarlama onayı</td><td style="padding:8px 0;font-weight:500;">${p.marketing_opt_in ? "✓ Evet" : "✗ Hayır"}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Tarih</td><td style="padding:8px 0;font-weight:500;">${escapeHtml(row.created_at)}</td></tr>
    </table>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E5E2DD;">
      <p style="margin:0 0 8px;font-size:13px;color:#6B7280;">Demo erişim URL'si:</p>
      <code style="font-size:12px;color:#1E2D5E;word-break:break-all;">https://hellotalent.ai/ik.html?demo_token=${escapeHtml(row.demo_token)}</code>
    </div>
    <p style="margin-top:24px;color:#6B7280;font-size:12px;">
      Lead ID: <code>${escapeHtml(row.id)}</code><br>
      HelloTalent Sales · MVP 1
    </p>
  </div>
</body>
</html>`;

  const text = `${hot ? "🔥 HOT LEAD\n\n" : ""}${p.company_name} — ${p.full_name}
Email: ${p.email}
Telefon: ${p.phone || "—"}
Şirket türü: ${SEGMENT_LABELS[p.segment_type]}
Ekip: ${p.team_size}
Aylık açık pozisyon: ${p.monthly_positions}
Aciliyet: ${URGENCY_LABELS[p.urgency || ""] || "—"}
Pazarlama onayı: ${p.marketing_opt_in ? "✓" : "✗"}
Lead ID: ${row.id}
Demo URL: https://hellotalent.ai/ik.html?demo_token=${row.demo_token}`;

  return { subject, html, text };
}

async function sendEmail(p: LeadPayload, row: InsertedRow): Promise<void> {
  const { subject, html, text } = renderEmail(p, row);
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [SALES_EMAIL],
      reply_to: p.email,
      subject,
      html,
      text,
      tags: [
        { name: "category", value: "hr_lead" },
        { name: "hot", value: isHotLead(p) ? "true" : "false" },
        { name: "segment", value: p.segment_type },
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
    const lead = validation.value;

    // Capture forwarding metadata
    const ipHeader = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
    const ipAddress = ipHeader.split(",")[0].trim() || null;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: row, error: insertErr } = await supabase
      .from("hr_leads")
      .insert({
        email: lead.email,
        full_name: lead.full_name,
        company_name: lead.company_name,
        segment_type: lead.segment_type,
        team_size: lead.team_size,
        monthly_positions: lead.monthly_positions,
        brands: lead.brands,
        position_types: lead.position_types,
        urgency: lead.urgency,
        phone: lead.phone,
        marketing_opt_in: lead.marketing_opt_in,
        responses: lead.responses || null,
        ip_address: ipAddress,
        user_agent: lead.user_agent || null,
      })
      .select("id, demo_token, created_at")
      .single();

    if (insertErr || !row) {
      console.error("hr_leads insert error:", insertErr?.message);
      return new Response(
        JSON.stringify({ error: "lead capture failed", detail: insertErr?.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    }

    // Email is non-blocking — failure shouldn't block lead capture
    let emailStatus: "sent" | "failed" = "sent";
    try {
      await sendEmail(lead, row as InsertedRow);
    } catch (emailErr) {
      console.error("email send failed:", (emailErr as Error).message);
      emailStatus = "failed";
    }

    return new Response(
      JSON.stringify({
        ok: true,
        demo_token: row.demo_token,
        lead_id: row.id,
        hot: isHotLead(lead),
        email_status: emailStatus,
      }),
      { headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
    );
  } catch (err) {
    console.error("notify-hr-lead error:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: "internal", detail: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
    );
  }
});
