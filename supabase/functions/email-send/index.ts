// email-send — Outbox Processor & Resend Delivery
// Schedule: */1 * * * * (every 1 minute via pg_cron)
// Spec: docs/superpowers/specs/2026-03-20-transactional-email-phase1-design.md
//
// Claims pending outbox rows, renders templates, sends via Resend API.
// Handles retry with exponential backoff and stale recovery.
// dedupe_key is sent as Idempotency-Key to Resend for dual-layer protection.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "HelloTalent <noreply@hellotalent.ai>";
const REPLY_TO = Deno.env.get("REPLY_TO") || "support@hellotalent.ai";

const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 3;
const STALE_THRESHOLD_MINUTES = 10;

Deno.serve(async (_req: Request) => {
  try {
    // Auth: JWT verification is handled by Supabase gateway (deploy without --no-verify-jwt).
    // Only service_role or authenticated JWTs reach this point.

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Step 1: Stale recovery — reset rows stuck in processing for 10+ minutes
    await supabase
      .from("email_outbox")
      .update({ status: "pending", processing_started_at: null })
      .eq("status", "processing")
      .lt(
        "processing_started_at",
        new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString(),
      );

    // Step 2: Claim batch
    const { data: batch, error: claimError } = await supabase.rpc(
      "claim_email_outbox_batch",
      { p_limit: BATCH_SIZE },
    );

    if (claimError) {
      console.error("claim error:", claimError.message);
      return new Response(
        JSON.stringify({ error: claimError.message }),
        { status: 500 },
      );
    }

    if (!batch || batch.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, failed: 0, retried: 0 }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    let sent = 0;
    let failed = 0;
    let retried = 0;

    // Step 3: Process each row
    for (const row of batch) {
      try {
        const template = renderTemplate(row.email_type, row.payload);
        await sendViaResend(template, row.recipient_email, row.dedupe_key);

        // Success
        await supabase
          .from("email_outbox")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id);
        sent++;
      } catch (err) {
        const errorMsg = (err as Error).message || "Unknown error";
        const newAttempt = (row.attempt_count || 0) + 1;

        if (newAttempt >= MAX_ATTEMPTS) {
          // Permanent failure
          await supabase
            .from("email_outbox")
            .update({
              status: "failed",
              attempt_count: newAttempt,
              last_error: errorMsg,
              failed_at: new Date().toISOString(),
            })
            .eq("id", row.id);
          failed++;
        } else {
          // Retry with exponential backoff: n^2 minutes
          const retryMinutes = newAttempt * newAttempt;
          const nextRetry = new Date(
            Date.now() + retryMinutes * 60 * 1000,
          ).toISOString();

          await supabase
            .from("email_outbox")
            .update({
              status: "pending",
              attempt_count: newAttempt,
              last_error: errorMsg,
              next_retry_at: nextRetry,
              processing_started_at: null,
            })
            .eq("id", row.id);
          retried++;
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, claimed: batch.length, sent, failed, retried }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("email-send error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500 },
    );
  }
});

// ═══════════════════════════════════════════════════
// RESEND API
// ═══════════════════════════════════════════════════

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

async function sendViaResend(
  content: EmailContent,
  to: string,
  idempotencyKey: string,
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      reply_to: REPLY_TO,
      subject: content.subject,
      html: content.html,
      text: content.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

// ═══════════════════════════════════════════════════
// TEMPLATE ENGINE
// ═══════════════════════════════════════════════════

interface Payload {
  full_name?: string | null;
  recipient_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  cta_url?: string;
  sender_name?: string;
  message_preview?: string | null;
  sent_at?: string | null;
  settings_url?: string | null;
  display_name?: string | null;
  invite_url?: string | null;
  expires_at?: string | null;
  coach_name?: string | null;
  post_title?: string | null;
  status?: string | null;
  admin_note?: string | null;
  studio_url?: string | null;
  // Support ticket fields
  candidate_name?: string | null;
  candidate_email?: string | null;
  ticket_no?: string | null;
  subject?: string | null;
  category?: string | null;
  description?: string | null;
  current_panel?: string | null;
  page_path?: string | null;
  user_agent?: string | null;
  resolution_message?: string | null;
  reply_body?: string | null;
}

function renderTemplate(
  emailType: string,
  payload: Payload,
): EmailContent {
  switch (emailType) {
    case "candidate_welcome":
      return candidateWelcomeTemplate(payload);
    case "employer_welcome":
      return employerWelcomeTemplate(payload);
    case "new_message":
      return newMessageTemplate(payload);
    case "coach_invite":
      return coachInviteTemplate(payload);
    case "coach_post_published":
    case "coach_post_changes_requested":
    case "coach_post_rejected":
    case "coach_post_archived":
    case "coach_post_deletion_requested":
    case "coach_post_deletion_dismissed":
      return coachPostNotificationTemplate(payload);
    case "support_ticket_confirmation":
      return supportTicketConfirmationTemplate(payload);
    case "support_ticket_internal_alert":
      return supportTicketInternalAlertTemplate(payload);
    case "support_ticket_resolved":
      return supportTicketResolvedTemplate(payload);
    case "support_ticket_admin_reply":
      return supportTicketAdminReplyTemplate(payload);
    case "support_ticket_candidate_reply":
      return supportTicketCandidateReplyTemplate(payload);
    case "support_ticket_auto_closed":
      return supportTicketAutoClosedTemplate(payload);
    case "candidate_reply_notification":
      return candidateReplyNotificationTemplate(payload);
    default:
      throw new Error(`Unknown email_type: ${emailType}`);
  }
}

// ─── HTML escape ─────────────────────────────────────

// Escapes user-authored content before inserting into HTML templates.
// Prevents layout breakage and XSS from dynamic fields like
// sender_name, message_preview, full_name, company_name, email.
function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Shared HTML helpers ─────────────────────────────

const COLORS = {
  verm: "#C94E28",
  navy: "#1E2D5E",
  bg: "#F7F6F4",
  border: "#E5E3DF",
  text: "#111111",
  muted: "#6B7280",
  white: "#FFFFFF",
};

function emailWrapper(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${COLORS.white};border-radius:12px;border:1px solid ${COLORS.border};overflow:hidden;">
${bodyContent}
</table>
</td></tr>
</table>
</body>
</html>`;
}

function logoRow(): string {
  return `<tr><td style="padding:28px 32px 16px;text-align:center;">
<a href="https://hellotalent.ai" style="text-decoration:none;font-family:'Bricolage Grotesque',Georgia,serif;font-size:22px;font-weight:700;color:${COLORS.navy};">
Hello<span style="color:${COLORS.verm};">Talent</span>
</a>
</td></tr>`;
}

function ctaButton(label: string, url: string): string {
  return `<tr><td style="padding:8px 32px 24px;">
<table cellpadding="0" cellspacing="0" style="margin:0 auto;">
<tr><td style="background:${COLORS.verm};border-radius:8px;">
<a href="${url}" style="display:inline-block;padding:14px 32px;color:${COLORS.white};text-decoration:none;font-family:'Plus Jakarta Sans',-apple-system,sans-serif;font-size:15px;font-weight:600;">
${label}
</a>
</td></tr>
</table>
</td></tr>`;
}

function footerRow(extra?: string): string {
  const extraLine = extra
    ? `<p style="margin:0 0 12px;">${extra}</p>`
    : "";
  return `<tr><td style="padding:20px 32px;border-top:1px solid ${COLORS.border};font-size:12px;color:${COLORS.muted};line-height:1.5;">
${extraLine}
<p style="margin:0;">&copy; 2026 HelloTalent &mdash; Perakende sekt\u00f6r\u00fcne \u00f6zel yetenek platformu</p>
<p style="margin:4px 0 0;"><a href="https://hellotalent.ai/gizlilik.html" style="color:${COLORS.muted};">Gizlilik Politikas\u0131</a> &middot; <a href="https://hellotalent.ai/kullanim-sartlari.html" style="color:${COLORS.muted};">Kullan\u0131m \u015eartlar\u0131</a></p>
<p style="margin:4px 0 0;">Bu bir hesap bildirimidir.</p>
</td></tr>`;
}

// ─── Candidate Welcome ──────────────────────────────

function candidateWelcomeTemplate(p: Payload): EmailContent {
  const name = esc(p.full_name);
  const greeting = name ? `Ho\u015f geldiniz, ${name}!` : "Ho\u015f geldiniz!";
  const greetingPlain = p.full_name ? `Ho\u015f geldiniz, ${p.full_name}!` : "Ho\u015f geldiniz!";
  const ctaUrl = p.cta_url || "https://hellotalent.ai/giris.html";

  const securityNote = p.email
    ? `<tr><td style="padding:0 32px 20px;font-size:13px;color:${COLORS.muted};line-height:1.5;">
Bu e-posta ${esc(p.email)} adresine g\u00f6nderildi \u00e7\u00fcnk\u00fc bu adresle bir HelloTalent hesab\u0131 olu\u015fturuldu. E\u011fer bu siz de\u011filseniz, bu e-postay\u0131 g\u00f6rmezden gelebilirsiniz.
</td></tr>`
    : "";

  const html = emailWrapper(`
${logoRow()}
<tr><td style="padding:8px 32px 4px;text-align:center;">
<span style="display:none;max-height:0;overflow:hidden;">Profilinizi tamamlay\u0131n, perakende sekt\u00f6r\u00fcndeki i\u015fverenler sizi g\u00f6rs\u00fcn.</span>
<h1 style="margin:0;font-family:'Bricolage Grotesque',Georgia,serif;font-size:24px;color:${COLORS.navy};font-weight:700;">${greeting}</h1>
</td></tr>
<tr><td style="padding:16px 32px;font-size:15px;color:${COLORS.text};line-height:1.6;">
<p style="margin:0 0 12px;">HelloTalent\u2019a kat\u0131ld\u0131n\u0131z \u2014 T\u00fcrkiye\u2019nin perakende sekt\u00f6r\u00fcne \u00f6zel yetenek platformu.</p>
<p style="margin:0 0 16px;">Profilinizi tamamlad\u0131\u011f\u0131n\u0131zda, sekt\u00f6rdeki i\u015fverenler sizi bulabilir ve size uygun pozisyonlarla e\u015fle\u015febilirsiniz.</p>
<p style="margin:0 0 4px;"><strong>1. Profilinizi olu\u015fturun</strong> \u2014 Deneyim, tercihler ve hedeflerinizi ekleyin.</p>
<p style="margin:0 0 4px;"><strong>2. G\u00f6r\u00fcn\u00fcr olun</strong> \u2014 \u0130\u015fverenler sizi arama sonu\u00e7lar\u0131nda g\u00f6rs\u00fcn.</p>
<p style="margin:0 0 0;"><strong>3. E\u015fle\u015fin</strong> \u2014 Size uygun pozisyonlar i\u00e7in i\u015fverenlerden mesaj al\u0131n.</p>
</td></tr>
${ctaButton("Giri\u015f Yap ve Profilini Tamamla", ctaUrl)}
${securityNote}
${footerRow()}
`);

  const text = `${greetingPlain}

HelloTalent\u2019a kat\u0131ld\u0131n\u0131z \u2014 T\u00fcrkiye\u2019nin perakende sekt\u00f6r\u00fcne \u00f6zel yetenek platformu.

Profilinizi tamamlad\u0131\u011f\u0131n\u0131zda, sekt\u00f6rdeki i\u015fverenler sizi bulabilir ve size uygun pozisyonlarla e\u015fle\u015febilirsiniz.

\u00dc\u00e7 ad\u0131mda ba\u015flay\u0131n:

1. Profilinizi olu\u015fturun \u2014 Deneyim, tercihler ve hedeflerinizi ekleyin.
2. G\u00f6r\u00fcn\u00fcr olun \u2014 \u0130\u015fverenler sizi arama sonu\u00e7lar\u0131nda g\u00f6rs\u00fcn.
3. E\u015fle\u015fin \u2014 Size uygun pozisyonlar i\u00e7in i\u015fverenlerden mesaj al\u0131n.

\u2192 Giri\u015f Yap ve Profilini Tamamla: ${ctaUrl}

---
${p.email ? `Bu e-posta ${p.email} adresine g\u00f6nderildi.\n` : ""}\
\u00a9 2026 HelloTalent
Gizlilik: https://hellotalent.ai/gizlilik.html
Kullan\u0131m \u015eartlar\u0131: https://hellotalent.ai/kullanim-sartlari.html`;

  return {
    subject: "HelloTalent\u2019e ho\u015f geldiniz",
    html,
    text,
  };
}

// ─── Employer Welcome ───────────────────────────────

function employerWelcomeTemplate(p: Payload): EmailContent {
  const name = esc(p.full_name);
  const greeting = name ? `Ho\u015f geldiniz, ${name}!` : "Ho\u015f geldiniz!";
  const greetingPlain = p.full_name ? `Ho\u015f geldiniz, ${p.full_name}!` : "Ho\u015f geldiniz!";
  const ctaUrl = p.cta_url || "https://hellotalent.ai/giris.html?tab=ik";

  const companyLine = p.company_name
    ? `<tr><td style="padding:0 32px 8px;font-size:15px;color:${COLORS.muted};">${esc(p.company_name)} olarak HelloTalent\u2019a ho\u015f geldiniz.</td></tr>`
    : "";

  const securityNote = p.email
    ? `<tr><td style="padding:0 32px 20px;font-size:13px;color:${COLORS.muted};line-height:1.5;">
Bu e-posta ${esc(p.email)} adresine g\u00f6nderildi \u00e7\u00fcnk\u00fc bu adresle bir HelloTalent i\u015fveren hesab\u0131 olu\u015fturuldu. E\u011fer bu siz de\u011filseniz, bu e-postay\u0131 g\u00f6rmezden gelebilirsiniz.
</td></tr>`
    : "";

  const html = emailWrapper(`
${logoRow()}
<tr><td style="padding:8px 32px 4px;text-align:center;">
<span style="display:none;max-height:0;overflow:hidden;">\u0130K panelinize giri\u015f yap\u0131n ve perakende aday havuzuyla tan\u0131\u015f\u0131n.</span>
<h1 style="margin:0;font-family:'Bricolage Grotesque',Georgia,serif;font-size:24px;color:${COLORS.navy};font-weight:700;">${greeting}</h1>
</td></tr>
${companyLine}
<tr><td style="padding:16px 32px;font-size:15px;color:${COLORS.text};line-height:1.6;">
<p style="margin:0 0 12px;">HelloTalent \u0130K paneline kat\u0131ld\u0131n\u0131z.</p>
<p style="margin:0 0 16px;">T\u00fcrkiye\u2019nin perakende sekt\u00f6r\u00fcne \u00f6zel yetenek platformunda, arad\u0131\u011f\u0131n\u0131z deneyim ve yetkinliklere sahip adaylara do\u011frudan ula\u015fabilirsiniz.</p>
<p style="margin:0 0 4px;"><strong>1. \u0130K panelinize giri\u015f yap\u0131n</strong> \u2014 \u015eirket bilgilerinizi tamamlay\u0131n.</p>
<p style="margin:0 0 4px;"><strong>2. Pozisyon olu\u015fturun</strong> \u2014 Arad\u0131\u011f\u0131n\u0131z rol, deneyim ve segment bilgilerini girin.</p>
<p style="margin:0 0 0;"><strong>3. Adaylarla e\u015fle\u015fin</strong> \u2014 Sistem, pozisyonunuza en uygun adaylar\u0131 \u00f6ne \u00e7\u0131kar\u0131r.</p>
</td></tr>
${ctaButton("\u0130K Paneline Giri\u015f Yap", ctaUrl)}
${securityNote}
${footerRow()}
`);

  const text = `${greetingPlain}

${p.company_name ? `${p.company_name} olarak HelloTalent\u2019a ho\u015f geldiniz.\n\n` : ""}\
HelloTalent \u0130K paneline kat\u0131ld\u0131n\u0131z.

T\u00fcrkiye\u2019nin perakende sekt\u00f6r\u00fcne \u00f6zel yetenek platformunda, arad\u0131\u011f\u0131n\u0131z deneyim ve yetkinliklere sahip adaylara do\u011frudan ula\u015fabilirsiniz.

\u00dc\u00e7 ad\u0131mda ba\u015flay\u0131n:

1. \u0130K panelinize giri\u015f yap\u0131n \u2014 \u015eirket bilgilerinizi tamamlay\u0131n.
2. Pozisyon olu\u015fturun \u2014 Arad\u0131\u011f\u0131n\u0131z rol, deneyim ve segment bilgilerini girin.
3. Adaylarla e\u015fle\u015fin \u2014 Sistem, pozisyonunuza en uygun adaylar\u0131 \u00f6ne \u00e7\u0131kar\u0131r.

\u2192 \u0130K Paneline Giri\u015f Yap: ${ctaUrl}

---
${p.email ? `Bu e-posta ${p.email} adresine g\u00f6nderildi.\n` : ""}\
\u00a9 2026 HelloTalent
Gizlilik: https://hellotalent.ai/gizlilik.html
Kullan\u0131m \u015eartlar\u0131: https://hellotalent.ai/kullanim-sartlari.html`;

  return {
    subject: "HelloTalent i\u015fveren hesab\u0131n\u0131z haz\u0131r",
    html,
    text,
  };
}

// ─── New Message Notification ───────────────────────

function newMessageTemplate(p: Payload): EmailContent {
  const recipientNameEsc = esc(p.recipient_name);
  const greeting = recipientNameEsc
    ? `Merhaba ${recipientNameEsc},`
    : "Merhaba,";
  const greetingPlain = p.recipient_name
    ? `Merhaba ${p.recipient_name},`
    : "Merhaba,";
  const ctaUrl = p.cta_url || "https://hellotalent.ai/giris.html";
  const settingsUrl = p.settings_url || "https://hellotalent.ai/giris.html";
  const senderName = p.sender_name || "HelloTalent \u0130\u015fveren Ekibi";
  const senderNameEsc = esc(senderName);
  const preview = p.message_preview || "Mesaj\u0131 g\u00f6r\u00fcnt\u00fclemek i\u00e7in giri\u015f yap\u0131n.";
  const previewEsc = esc(preview);
  const timeStr = p.sent_at
    ? `<span style="color:${COLORS.muted};font-size:13px;margin-left:8px;">${esc(p.sent_at)}</span>`
    : "";

  const html = emailWrapper(`
${logoRow()}
<tr><td style="padding:8px 32px 4px;text-align:center;">
<span style="display:none;max-height:0;overflow:hidden;">Mesaj\u0131n\u0131z\u0131 g\u00f6r\u00fcnt\u00fclemek i\u00e7in giri\u015f yap\u0131n.</span>
<h1 style="margin:0;font-family:'Bricolage Grotesque',Georgia,serif;font-size:20px;color:${COLORS.navy};font-weight:700;">Yeni mesaj\u0131n\u0131z var</h1>
</td></tr>
<tr><td style="padding:16px 32px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:12px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:15px;font-weight:700;color:${COLORS.text};">${senderNameEsc}${timeStr}</p>
<p style="margin:0;font-size:14px;color:${COLORS.text};line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${previewEsc}</p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:4px 32px 8px;font-size:13px;color:${COLORS.muted};line-height:1.5;">
Yan\u0131tlamak i\u00e7in HelloTalent\u2019a giri\u015f yap\u0131n. Mesajlar platform \u00fczerinden iletilir.
</td></tr>
${ctaButton("Mesaj\u0131 G\u00f6r\u00fcnt\u00fcle", ctaUrl)}
${footerRow(`Bu bildirimi almak istemiyorsan\u0131z <a href="${settingsUrl}" style="color:${COLORS.muted};">Ayarlar</a> sayfas\u0131ndan mesaj bildirimlerini kapatabilirsiniz.`)}
`);

  const text = `${greetingPlain}

Yeni mesaj\u0131n\u0131z var.

${senderName}${p.sent_at ? ` \u2014 ${p.sent_at}` : ""}
${preview}

Yan\u0131tlamak i\u00e7in HelloTalent\u2019a giri\u015f yap\u0131n. Mesajlar platform \u00fczerinden iletilir.

\u2192 Mesaj\u0131 G\u00f6r\u00fcnt\u00fcle: ${ctaUrl}

---
Bu bildirimi almak istemiyorsan\u0131z: ${settingsUrl}

\u00a9 2026 HelloTalent
Gizlilik: https://hellotalent.ai/gizlilik.html`;

  return {
    subject: "HelloTalent\u2019te yeni bir mesaj\u0131n\u0131z var",
    html,
    text,
  };
}

// ─── Coach Invite ─────────────────────────────────────

function coachInviteTemplate(p: Payload): EmailContent {
  const name = esc(p.display_name);
  const greeting = name ? `Merhaba ${name}` : "Merhaba";
  const greetingPlain = p.display_name ? `Merhaba ${p.display_name}` : "Merhaba";
  const inviteUrl = p.invite_url || "https://hellotalent.ai/coach-studio.html";

  const html = emailWrapper(`
${logoRow()}
<tr><td style="padding:8px 32px 4px;text-align:center;">
<span style="display:none;max-height:0;overflow:hidden;">HelloTalent Ko\u00e7 Studio\u2019ya davet edildiniz.</span>
<h1 style="margin:0;font-family:'Bricolage Grotesque',Georgia,serif;font-size:24px;color:${COLORS.navy};font-weight:700;">${greeting}</h1>
</td></tr>
<tr><td style="padding:16px 32px;font-size:15px;color:${COLORS.text};line-height:1.6;">
<p style="margin:0 0 12px;">HelloTalent Ko\u00e7 Studio\u2019ya davet edildiniz. Ko\u00e7 olarak m\u00fclakat ipuclar\u0131, yetkinlik rehberleri ve kariyer hikayeleri yazabilirsiniz.</p>
<p style="margin:0 0 12px;">Yaz\u0131lar\u0131n\u0131z onaylanarak binlerce perakende adaya ula\u015ft\u0131r\u0131l\u0131r.</p>
<p style="margin:0 0 16px;">A\u015fa\u011f\u0131daki ba\u011flant\u0131ya t\u0131klayarak daveti kabul edin ve yazmaya ba\u015flay\u0131n.</p>
</td></tr>
${ctaButton("Daveti Kabul Et", inviteUrl)}
${footerRow("Bu davet size HelloTalent admin taraf\u0131ndan g\u00f6nderilmi\u015ftir.")}
`);

  const text = `${greetingPlain}

HelloTalent Ko\u00e7 Studio\u2019ya davet edildiniz.

Ko\u00e7 olarak m\u00fclakat ipuclar\u0131, yetkinlik rehberleri ve kariyer hikayeleri yazabilirsiniz. Yaz\u0131lar\u0131n\u0131z onaylanarak binlerce perakende adaya ula\u015ft\u0131r\u0131l\u0131r.

Daveti Kabul Et: ${inviteUrl}

---
\u00a9 2026 HelloTalent
Gizlilik: https://hellotalent.ai/gizlilik.html`;

  return {
    subject: "HelloTalent Ko\u00e7 Studio\u2019ya Davet",
    html,
    text,
  };
}

// ─── Coach Post Notification Templates ─────────────
function coachPostNotificationTemplate(p: Payload): EmailContent {
  const name = esc(p.coach_name);
  const title = esc(p.post_title);
  const greeting = name ? `Merhaba ${name}` : "Merhaba";
  const greetingPlain = p.coach_name ? `Merhaba ${p.coach_name}` : "Merhaba";
  const studioUrl = p.studio_url || "https://hellotalent.ai/coach-studio.html";
  /* Suppress internal sentinel value from being displayed as a real admin note */
  const isInternalNote = p.admin_note === "__deletion_approved__";
  const adminNote = (p.admin_note && !isInternalNote) ? esc(p.admin_note) : "";
  const adminNotePlain = (p.admin_note && !isInternalNote) ? p.admin_note : "";

  let subject = "";
  let statusMsg = "";
  let statusMsgPlain = "";
  let statusColor = COLORS.navy;

  if (p.status === "published") {
    subject = `Yaz\u0131n\u0131z Yay\u0131nland\u0131: ${p.post_title || ""}`;
    statusMsg = `<strong>\u201C${title}\u201D</strong> ba\u015fl\u0131kl\u0131 yaz\u0131n\u0131z ba\u015far\u0131yla yay\u0131nland\u0131! Art\u0131k adaylar taraf\u0131ndan okunabilir.<br><br>Yaz\u0131n\u0131z\u0131 sosyal medyada payla\u015farak daha fazla okuyucuya ula\u015fabilirsiniz. Ko\u00e7 Studio\u2019daki <strong>Yay\u0131nda</strong> sekmesinden WhatsApp, LinkedIn ve Facebook payla\u015f\u0131m ara\u00e7lar\u0131n\u0131 kullanabilirsiniz.`;
    statusMsgPlain = `"${p.post_title || ""}" baslikli yaziniz yayinlandi! Yazinizi sosyal medyada paylasarak daha fazla okuyucuya ulasabilirsiniz. Koc Studio'daki Yayinda sekmesinden paylasim araclarini kullanabilirsiniz.`;
    statusColor = "#10B981";
  } else if (p.status === "changes_requested") {
    subject = `D\u00FCzeltme Istendi: ${p.post_title || ""}`;
    statusMsg = `<strong>\u201C${title}\u201D</strong> ba\u015fl\u0131kl\u0131 yaz\u0131n\u0131z i\u00e7in d\u00fczeltme istendi. L\u00fctfen Ko\u00e7 Studio\u2019dan yaz\u0131n\u0131z\u0131 g\u00f6zden ge\u00e7irin.`;
    statusMsgPlain = `"${p.post_title || ""}" baslikli yaziniz icin duzeltme istendi.`;
    statusColor = COLORS.verm;
  } else if (p.status === "rejected") {
    subject = `Yaz\u0131n\u0131z Yay\u0131nlanmad\u0131: ${p.post_title || ""}`;
    statusMsg = `<strong>\u201C${title}\u201D</strong> ba\u015fl\u0131kl\u0131 yaz\u0131n\u0131z bu a\u015famada yay\u0131nlanmad\u0131. Daha fazla bilgi i\u00e7in a\u015fa\u011f\u0131daki notu inceleyebilirsiniz.`;
    statusMsgPlain = `"${p.post_title || ""}" baslikli yaziniz yayinlanmadi.`;
    statusColor = "#EF4444";
  } else if (p.status === "archived") {
    const isDeletionApproval = p.admin_note === "__deletion_approved__";
    subject = isDeletionApproval
      ? `Silme Talebiniz Onayland\u0131: ${p.post_title || ""}`
      : `Yaz\u0131n\u0131z Ar\u015fivlendi: ${p.post_title || ""}`;
    statusMsg = isDeletionApproval
      ? `<strong>\u201C${title}\u201D</strong> ba\u015fl\u0131kl\u0131 yaz\u0131n\u0131z i\u00e7in g\u00f6nderdi\u011finiz silme talebi onayland\u0131. Yaz\u0131n\u0131z ar\u015fivlendi ve art\u0131k feed\u2019de g\u00f6r\u00fcnm\u00fcyor.`
      : `<strong>\u201C${title}\u201D</strong> ba\u015fl\u0131kl\u0131 yaz\u0131n\u0131z ar\u015fivlendi ve art\u0131k feed\u2019de g\u00f6r\u00fcnm\u00fcyor.`;
    statusMsgPlain = isDeletionApproval
      ? `"${p.post_title || ""}" baslikli yaziniz icin silme talebiniz onaylandi. Yaziniz arsivlendi.`
      : `"${p.post_title || ""}" baslikli yaziniz arsivlendi ve artik feed'de gorunmuyor.`;
    statusColor = "#6B7280";
  } else if (p.status === "deletion_requested") {
    subject = `Silme Talebi Al\u0131nd\u0131: ${p.post_title || ""}`;
    statusMsg = `<strong>\u201C${title}\u201D</strong> ba\u015fl\u0131kl\u0131 yaz\u0131n\u0131z i\u00e7in silme talebi al\u0131nd\u0131. Talebiniz en k\u0131sa s\u00fcrede de\u011ferlendirilecektir.`;
    statusMsgPlain = `"${p.post_title || ""}" baslikli yaziniz icin silme talebi alindi. Talebiniz en kisa surede degerlendirilecektir.`;
    statusColor = COLORS.navy;
  } else if (p.status === "deletion_dismissed") {
    subject = `Silme Talebiniz Reddedildi: ${p.post_title || ""}`;
    statusMsg = `<strong>\u201C${title}\u201D</strong> ba\u015fl\u0131kl\u0131 yaz\u0131n\u0131z i\u00e7in g\u00f6nderdi\u011finiz silme talebi reddedildi. Yaz\u0131n\u0131z yay\u0131nda kalmaya devam edecektir.`;
    statusMsgPlain = `"${p.post_title || ""}" baslikli yaziniz icin silme talebiniz reddedildi. Yaziniz yayinda kalmaya devam edecektir.`;
    statusColor = COLORS.verm;
  }

  const noteBlock = adminNote
    ? `<tr><td style="padding:0 32px 16px;"><div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:12px 16px;font-size:13px;color:#78350F;line-height:1.5;"><strong>Admin Notu:</strong> ${adminNote}</div></td></tr>`
    : "";
  const noteBlockPlain = adminNotePlain
    ? `\nAdmin Notu: ${adminNotePlain}\n`
    : "";

  const html = emailWrapper(`
${logoRow()}
<tr><td style="padding:8px 32px 4px;text-align:center;">
<h1 style="margin:0;font-family:'Bricolage Grotesque',Georgia,serif;font-size:22px;color:${COLORS.navy};font-weight:700;">${greeting}</h1>
</td></tr>
<tr><td style="padding:16px 32px;font-size:15px;color:${COLORS.text};line-height:1.6;">
<div style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;color:#fff;background:${statusColor};margin-bottom:12px;">${p.status === "published" ? "Yay\u0131nda" : p.status === "changes_requested" ? "D\u00FCzeltme Gerekli" : p.status === "archived" ? "Ar\u015fivlendi" : p.status === "deletion_dismissed" ? "Talep Reddedildi" : p.status === "deletion_requested" ? "Silme Talebi" : "Reddedildi"}</div>
<p style="margin:0 0 16px;">${statusMsg}</p>
</td></tr>
${noteBlock}
${ctaButton("Ko\u00e7 Studio\u2019ya Git", studioUrl)}
${footerRow("Bu bildirim HelloTalent i\u00e7erik y\u00f6netimi taraf\u0131ndan g\u00f6nderilmi\u015ftir.")}
`);

  const text = `${greetingPlain}

${statusMsgPlain}
${noteBlockPlain}
Koc Studio: ${studioUrl}

---
\u00a9 2026 HelloTalent
Gizlilik: https://hellotalent.ai/gizlilik.html`;

  return { subject, html, text };
}

// ─── Support Ticket Confirmation (candidate) ─────────

const SUPPORT_CATEGORIES: Record<string, string> = {
  hesap_giris: "Hesap ve Giri\u015f",
  profil_cv: "Profil ve CV",
  mesajlar_teklifler: "Mesajlar ve Teklifler",
  premium_odeme: "Premium ve \u00d6deme",
  teknik: "Teknik Sorunlar",
};

function supportTicketConfirmationTemplate(p: Payload): EmailContent {
  const name = esc(p.candidate_name);
  const greeting = name ? `Merhaba ${name},` : "Merhaba,";
  const greetingPlain = p.candidate_name
    ? `Merhaba ${p.candidate_name},`
    : "Merhaba,";
  const ticketNo = esc(p.ticket_no);
  const subjectEsc = esc(p.subject);
  const categoryLabel = SUPPORT_CATEGORIES[p.category || ""] || esc(p.category);
  const ctaUrl = "https://hellotalent.ai/profil.html#destek";

  const html = emailWrapper(`
${logoRow()}
<tr><td style="padding:8px 32px 4px;text-align:center;">
<span style="display:none;max-height:0;overflow:hidden;">Destek talebiniz al\u0131nd\u0131 \u2014 ${ticketNo}</span>
<h1 style="margin:0;font-family:'Bricolage Grotesque',Georgia,serif;font-size:22px;color:${COLORS.navy};font-weight:700;">${greeting}</h1>
</td></tr>
<tr><td style="padding:16px 32px;font-size:15px;color:${COLORS.text};line-height:1.6;">
<p style="margin:0 0 12px;">Destek talebiniz ba\u015far\u0131yla olu\u015fturuldu.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:10px;margin-bottom:16px;">
<tr><td style="padding:14px 16px;">
<p style="margin:0 0 6px;font-size:13px;color:${COLORS.muted};">Talep Numaras\u0131</p>
<p style="margin:0 0 12px;font-family:'DM Mono',monospace;font-size:16px;font-weight:700;color:${COLORS.verm};">${ticketNo}</p>
<p style="margin:0 0 4px;font-size:13px;color:${COLORS.muted};">Konu</p>
<p style="margin:0 0 12px;font-size:14px;font-weight:600;color:${COLORS.text};">${subjectEsc}</p>
<p style="margin:0 0 4px;font-size:13px;color:${COLORS.muted};">Kategori</p>
<p style="margin:0;font-size:14px;color:${COLORS.text};">${categoryLabel}</p>
</td></tr>
</table>
<p style="margin:0;">Talebinizi en k\u0131sa s\u00fcrede inceleyece\u011fiz. G\u00fcncellemeler bu e-posta adresine g\u00f6nderilecektir.</p>
</td></tr>
${ctaButton("Destek Merkezine Git", ctaUrl)}
${footerRow()}
`);

  const text = `${greetingPlain}

Destek talebiniz ba\u015far\u0131yla olu\u015fturuldu.

Talep Numaras\u0131: ${p.ticket_no || ""}
Konu: ${p.subject || ""}
Kategori: ${SUPPORT_CATEGORIES[p.category || ""] || p.category || ""}

Talebinizi en k\u0131sa s\u00fcrede inceleyece\u011fiz.

\u2192 Destek Merkezi: ${ctaUrl}

---
\u00a9 2026 HelloTalent
Gizlilik: https://hellotalent.ai/gizlilik.html`;

  return {
    subject: `Destek Talebiniz Al\u0131nd\u0131 \u2014 ${p.ticket_no || ""}`,
    html,
    text,
  };
}

// ─── Support Ticket Internal Alert (support team) ────

function supportTicketInternalAlertTemplate(p: Payload): EmailContent {
  const ticketNo = esc(p.ticket_no);
  const candidateName = esc(p.candidate_name);
  const candidateEmail = esc(p.candidate_email);
  const subjectEsc = esc(p.subject);
  const categoryLabel = SUPPORT_CATEGORIES[p.category || ""] || esc(p.category);
  const descEsc = esc(p.description);
  const panel = esc(p.current_panel);
  const path = esc(p.page_path);
  const ua = esc(p.user_agent);

  const html = emailWrapper(`
${logoRow()}
<tr><td style="padding:8px 32px 4px;">
<h1 style="margin:0;font-family:'Bricolage Grotesque',Georgia,serif;font-size:20px;color:${COLORS.navy};font-weight:700;">Yeni Destek Talebi: ${ticketNo}</h1>
</td></tr>
<tr><td style="padding:16px 32px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:10px;">
<tr><td style="padding:16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:${COLORS.text};line-height:2;">
<tr><td style="font-weight:700;color:${COLORS.muted};width:120px;vertical-align:top;">Talep No</td><td style="font-family:'DM Mono',monospace;color:${COLORS.verm};font-weight:700;">${ticketNo}</td></tr>
<tr><td style="font-weight:700;color:${COLORS.muted};vertical-align:top;">Aday</td><td>${candidateName} (${candidateEmail})</td></tr>
<tr><td style="font-weight:700;color:${COLORS.muted};vertical-align:top;">Kategori</td><td>${categoryLabel}</td></tr>
<tr><td style="font-weight:700;color:${COLORS.muted};vertical-align:top;">Konu</td><td style="font-weight:600;">${subjectEsc}</td></tr>
</table>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:0 32px 16px;">
<div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:16px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.5px;">A\u00e7\u0131klama</p>
<p style="margin:0;font-size:14px;color:${COLORS.text};line-height:1.6;white-space:pre-wrap;">${descEsc}</p>
</div>
</td></tr>
${panel || path || ua ? `<tr><td style="padding:0 32px 16px;font-size:11px;color:${COLORS.muted};line-height:1.8;">
${panel ? `Panel: ${panel}<br>` : ""}${path ? `Sayfa: ${path}<br>` : ""}${ua ? `UA: ${ua}` : ""}
</td></tr>` : ""}
${footerRow("Bu bir dahili destek bildirimidir.")}
`);

  const text = `Yeni Destek Talebi: ${p.ticket_no || ""}

Talep No: ${p.ticket_no || ""}
Aday: ${p.candidate_name || ""} (${p.candidate_email || ""})
Kategori: ${SUPPORT_CATEGORIES[p.category || ""] || p.category || ""}
Konu: ${p.subject || ""}

Aciklama:
${p.description || ""}

${p.current_panel ? `Panel: ${p.current_panel}` : ""}
${p.page_path ? `Sayfa: ${p.page_path}` : ""}
${p.user_agent ? `UA: ${p.user_agent}` : ""}

---
Dahili destek bildirimi - HelloTalent`;

  return {
    subject: `[Destek] ${p.ticket_no || ""} \u2014 ${p.subject || ""}`,
    html,
    text,
  };
}

function supportTicketResolvedTemplate(p: Payload): EmailContent {
  const name = esc(p.candidate_name);
  const greeting = name ? `Merhaba ${name}!` : "Merhaba!";
  const greetingPlain = p.candidate_name
    ? `Merhaba ${p.candidate_name}!`
    : "Merhaba!";
  const ticketNo = esc(p.ticket_no);
  const subjectEsc = esc(p.subject);
  const resolutionMsg = esc(p.resolution_message);
  const ctaUrl = "https://hellotalent.ai/profil.html#destek";

  const html = emailWrapper(`
${logoRow()}
<tr><td style="padding:8px 32px 4px;text-align:center;">
<span style="display:none;max-height:0;overflow:hidden;">Destek talebiniz \u00e7\u00f6z\u00fcld\u00fc \u2014 ${ticketNo}</span>
<h1 style="margin:0;font-family:'Bricolage Grotesque',Georgia,serif;font-size:22px;color:${COLORS.navy};font-weight:700;">${greeting}</h1>
</td></tr>
<tr><td style="padding:16px 32px;font-size:15px;color:${COLORS.text};line-height:1.6;">
<p style="margin:0 0 12px;">Destek talebiniz <strong>\u00e7\u00f6z\u00fcld\u00fc</strong> olarak i\u015faretlendi.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:10px;margin-bottom:16px;">
<tr><td style="padding:14px 16px;">
<p style="margin:0 0 6px;font-size:13px;color:${COLORS.muted};">Talep Numaras\u0131</p>
<p style="margin:0 0 12px;font-family:'DM Mono',monospace;font-size:16px;font-weight:700;color:${COLORS.verm};">${ticketNo}</p>
<p style="margin:0 0 4px;font-size:13px;color:${COLORS.muted};">Konu</p>
<p style="margin:0 0 12px;font-size:14px;font-weight:600;color:${COLORS.text};">${subjectEsc}</p>
${resolutionMsg ? `<p style="margin:0 0 4px;font-size:13px;color:${COLORS.muted};">\u00c7\u00f6z\u00fcm</p>
<p style="margin:0;font-size:14px;color:${COLORS.text};white-space:pre-wrap;">${resolutionMsg}</p>` : ""}
</td></tr>
</table>
<p style="margin:0 0 8px;">Sorun devam ediyorsa Destek Merkezi\u2019nden <strong>Devam Ediyor</strong> butonuna t\u0131klayarak bize bildirebilirsin.</p>
<p style="margin:0;font-size:13px;color:${COLORS.muted};">7 g\u00fcn i\u00e7inde yan\u0131t verilmezse talep otomatik olarak kapat\u0131lacakt\u0131r.</p>
</td></tr>
${ctaButton("Destek Merkezine Git", ctaUrl)}
${footerRow()}
`);

  const text = `${greetingPlain}

Destek talebiniz \u00e7\u00f6z\u00fcld\u00fc olarak i\u015faretlendi.

Talep Numaras\u0131: ${p.ticket_no || ""}
Konu: ${p.subject || ""}
${p.resolution_message ? `\u00c7\u00f6z\u00fcm: ${p.resolution_message}` : ""}

Sorun devam ediyorsa Destek Merkezi'nden "Devam Ediyor" butonuna t\u0131klayarak bize bildirebilirsin.
7 g\u00fcn i\u00e7inde yan\u0131t verilmezse talep otomatik olarak kapat\u0131lacakt\u0131r.

\u2192 Destek Merkezi: ${ctaUrl}

---
\u00a9 2026 HelloTalent
Gizlilik: https://hellotalent.ai/gizlilik.html`;

  return {
    subject: `Destek Talebiniz \u00c7\u00f6z\u00fcld\u00fc \u2014 ${p.ticket_no || ""}`,
    html,
    text,
  };
}

// ─── Support Ticket Admin Reply (to candidate) ───────

function supportTicketAdminReplyTemplate(p: Payload): EmailContent {
  const name = esc(p.candidate_name);
  const greeting = name ? `Merhaba ${name},` : "Merhaba,";
  const greetingPlain = p.candidate_name
    ? `Merhaba ${p.candidate_name},`
    : "Merhaba,";
  const ticketNo = esc(p.ticket_no);
  const subjectEsc = esc(p.subject);
  const replyBody = esc(p.reply_body);
  const ctaUrl = "https://hellotalent.ai/profil.html#destek";

  const html = emailWrapper(`
${logoRow()}
<tr><td style="padding:8px 32px 4px;text-align:center;">
<span style="display:none;max-height:0;overflow:hidden;">Destek talebinize yan\u0131t geldi \u2014 ${ticketNo}</span>
<h1 style="margin:0;font-family:'Bricolage Grotesque',Georgia,serif;font-size:22px;color:${COLORS.navy};font-weight:700;">${greeting}</h1>
</td></tr>
<tr><td style="padding:16px 32px;font-size:15px;color:${COLORS.text};line-height:1.6;">
<p style="margin:0 0 12px;">Destek talebinize yan\u0131t geldi.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:10px;margin-bottom:16px;">
<tr><td style="padding:14px 16px;">
<p style="margin:0 0 6px;font-size:13px;color:${COLORS.muted};">Talep</p>
<p style="margin:0 0 12px;font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:${COLORS.verm};">${ticketNo} \u2014 ${subjectEsc}</p>
<p style="margin:0 0 4px;font-size:13px;color:${COLORS.muted};">Destek Ekibi Yan\u0131t\u0131</p>
<p style="margin:0;font-size:14px;color:${COLORS.text};white-space:pre-wrap;">${replyBody}</p>
</td></tr>
</table>
<p style="margin:0;">Yan\u0131tlamak i\u00e7in Destek Merkezi\u2019nden talebini a\u00e7abilirsin.</p>
</td></tr>
${ctaButton("Destek Merkezine Git", ctaUrl)}
${footerRow()}
`);

  const text = `${greetingPlain}

Destek talebinize yan\u0131t geldi.

Talep: ${p.ticket_no || ""} \u2014 ${p.subject || ""}

Destek Ekibi Yan\u0131t\u0131:
${p.reply_body || ""}

Yan\u0131tlamak i\u00e7in Destek Merkezi'nden talebini a\u00e7abilirsin.

\u2192 Destek Merkezi: ${ctaUrl}

---
\u00a9 2026 HelloTalent
Gizlilik: https://hellotalent.ai/gizlilik.html`;

  return {
    subject: `Destek Talebinize Yan\u0131t \u2014 ${p.ticket_no || ""}`,
    html,
    text,
  };
}

// ─── Support Ticket Candidate Reply (to support team) ─

function supportTicketCandidateReplyTemplate(p: Payload): EmailContent {
  const ticketNo = esc(p.ticket_no);
  const candidateName = esc(p.candidate_name);
  const subjectEsc = esc(p.subject);
  const replyBody = esc(p.reply_body);

  const html = emailWrapper(`
${logoRow()}
<tr><td style="padding:8px 32px 4px;">
<h1 style="margin:0;font-family:'Bricolage Grotesque',Georgia,serif;font-size:20px;color:${COLORS.navy};font-weight:700;">Aday Yan\u0131t\u0131: ${ticketNo}</h1>
</td></tr>
<tr><td style="padding:16px 32px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:10px;">
<tr><td style="padding:16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:${COLORS.text};line-height:2;">
<tr><td style="font-weight:700;color:${COLORS.muted};width:120px;vertical-align:top;">Talep No</td><td style="font-family:'DM Mono',monospace;color:${COLORS.verm};font-weight:700;">${ticketNo}</td></tr>
<tr><td style="font-weight:700;color:${COLORS.muted};vertical-align:top;">Aday</td><td>${candidateName}</td></tr>
<tr><td style="font-weight:700;color:${COLORS.muted};vertical-align:top;">Konu</td><td style="font-weight:600;">${subjectEsc}</td></tr>
</table>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:0 32px 16px;">
<div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:16px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.5px;">Aday Yan\u0131t\u0131</p>
<p style="margin:0;font-size:14px;color:${COLORS.text};line-height:1.6;white-space:pre-wrap;">${replyBody}</p>
</div>
</td></tr>
${footerRow("Bu bir dahili destek bildirimidir.")}
`);

  const text = `Aday Yan\u0131t\u0131: ${p.ticket_no || ""}

Talep No: ${p.ticket_no || ""}
Aday: ${p.candidate_name || ""}
Konu: ${p.subject || ""}

Aday Yan\u0131t\u0131:
${p.reply_body || ""}

---
Dahili destek bildirimi - HelloTalent`;

  return {
    subject: `[Destek] Aday Yan\u0131t\u0131 \u2014 ${p.ticket_no || ""} \u2014 ${p.subject || ""}`,
    html,
    text,
  };
}

// ─── Support Ticket Auto-Closed (to candidate) ───────

function supportTicketAutoClosedTemplate(p: Payload): EmailContent {
  const name = esc(p.candidate_name);
  const greeting = name ? `Merhaba ${name},` : "Merhaba,";
  const greetingPlain = p.candidate_name
    ? `Merhaba ${p.candidate_name},`
    : "Merhaba,";
  const ticketNo = esc(p.ticket_no);
  const subjectEsc = esc(p.subject);
  const ctaUrl = "https://hellotalent.ai/profil.html#destek";

  const html = emailWrapper(`
${logoRow()}
<tr><td style="padding:8px 32px 4px;text-align:center;">
<span style="display:none;max-height:0;overflow:hidden;">Destek talebiniz kapat\u0131ld\u0131 \u2014 ${ticketNo}</span>
<h1 style="margin:0;font-family:'Bricolage Grotesque',Georgia,serif;font-size:22px;color:${COLORS.navy};font-weight:700;">${greeting}</h1>
</td></tr>
<tr><td style="padding:16px 32px;font-size:15px;color:${COLORS.text};line-height:1.6;">
<p style="margin:0 0 12px;">Destek talebiniz 7 g\u00fcn i\u00e7inde yan\u0131t al\u0131nmad\u0131\u011f\u0131 i\u00e7in otomatik olarak kapat\u0131ld\u0131.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:10px;margin-bottom:16px;">
<tr><td style="padding:14px 16px;">
<p style="margin:0 0 6px;font-size:13px;color:${COLORS.muted};">Talep</p>
<p style="margin:0;font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:${COLORS.verm};">${ticketNo} \u2014 ${subjectEsc}</p>
</td></tr>
</table>
<p style="margin:0;">Sorun devam ediyorsa Destek Merkezi\u2019nden yeni bir talep olu\u015fturabilirsin.</p>
</td></tr>
${ctaButton("Destek Merkezine Git", ctaUrl)}
${footerRow()}
`);

  const text = `${greetingPlain}

Destek talebiniz 7 g\u00fcn i\u00e7inde yan\u0131t al\u0131nmad\u0131\u011f\u0131 i\u00e7in otomatik olarak kapat\u0131ld\u0131.

Talep: ${p.ticket_no || ""} \u2014 ${p.subject || ""}

Sorun devam ediyorsa Destek Merkezi'nden yeni bir talep olu\u015fturabilirsin.

\u2192 Destek Merkezi: ${ctaUrl}

---
\u00a9 2026 HelloTalent
Gizlilik: https://hellotalent.ai/gizlilik.html`;

  return {
    subject: `Destek Talebiniz Kapat\u0131ld\u0131 \u2014 ${p.ticket_no || ""}`,
    html,
    text,
  };
}

// ─── Candidate Reply Notification (to employer) ──────

function candidateReplyNotificationTemplate(p: Payload): EmailContent {
  const recipientNameEsc = esc(p.recipient_name);
  const greeting = recipientNameEsc
    ? `Merhaba ${recipientNameEsc},`
    : "Merhaba,";
  const greetingPlain = p.recipient_name
    ? `Merhaba ${p.recipient_name},`
    : "Merhaba,";
  const ctaUrl = p.cta_url || "https://hellotalent.ai/giris.html?tab=ik";
  const candidateName = p.candidate_name || "Aday";
  const candidateNameEsc = esc(candidateName);
  const preview = p.message_preview || "Yan\u0131t\u0131 g\u00f6r\u00fcnt\u00fclemek i\u00e7in giri\u015f yap\u0131n.";
  const previewEsc = esc(preview);
  const subjectEsc = esc(p.subject);
  const timeStr = p.sent_at
    ? `<span style="color:${COLORS.muted};font-size:13px;margin-left:8px;">${esc(p.sent_at)}</span>`
    : "";

  const html = emailWrapper(`
${logoRow()}
<tr><td style="padding:8px 32px 4px;text-align:center;">
<span style="display:none;max-height:0;overflow:hidden;">Adaydan yan\u0131t geldi \u2014 ${subjectEsc}</span>
<h1 style="margin:0;font-family:'Bricolage Grotesque',Georgia,serif;font-size:20px;color:${COLORS.navy};font-weight:700;">Adaydan yan\u0131t geldi</h1>
</td></tr>
<tr><td style="padding:16px 32px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:12px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:15px;font-weight:700;color:${COLORS.text};">${candidateNameEsc}${timeStr}</p>
<p style="margin:0 0 8px;font-size:12px;color:${COLORS.muted};">Konu: ${subjectEsc}</p>
<p style="margin:0;font-size:14px;color:${COLORS.text};line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${previewEsc}</p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:4px 32px 8px;font-size:13px;color:${COLORS.muted};line-height:1.5;">
Yan\u0131tlamak i\u00e7in \u0130K panelinize giri\u015f yap\u0131n.
</td></tr>
${ctaButton("Mesajlar\u0131 G\u00f6r\u00fcnt\u00fcle", ctaUrl)}
${footerRow()}
`);

  const text = `${greetingPlain}

Adaydan yan\u0131t geldi.

${candidateName}${p.sent_at ? ` \u2014 ${p.sent_at}` : ""}
Konu: ${p.subject || ""}
${preview}

Yan\u0131tlamak i\u00e7in \u0130K panelinize giri\u015f yap\u0131n.

\u2192 Mesajlar\u0131 G\u00f6r\u00fcnt\u00fcle: ${ctaUrl}

---
\u00a9 2026 HelloTalent
Gizlilik: https://hellotalent.ai/gizlilik.html`;

  return {
    subject: `${candidateName} yan\u0131t g\u00f6nderdi \u2014 ${p.subject || ""}`,
    html,
    text,
  };
}
