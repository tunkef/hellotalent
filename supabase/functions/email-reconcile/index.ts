// email-reconcile — Welcome Email Reconciliation Cron
// Schedule: */5 * * * * (every 5 minutes via pg_cron)
// Spec: docs/superpowers/specs/2026-03-20-transactional-email-phase1-design.md
//
// Scans confirmed auth users via Admin API, enqueues welcome emails
// for candidates and employers who haven't received one yet.
// Does NOT send emails — email-send handles delivery.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (_req: Request) => {
  try {
    // Auth: JWT verification is handled by Supabase gateway (deploy without --no-verify-jwt).
    // Only service_role or authenticated JWTs reach this point.

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    let processed_candidates = 0;
    let processed_employers = 0;
    let skipped = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const {
        data: { users },
        error: listError,
      } = await supabase.auth.admin.listUsers({ page, perPage: 50 });

      if (listError) {
        console.error("listUsers error:", listError.message);
        return new Response(
          JSON.stringify({ error: listError.message, pages_completed: page - 1 }),
          { status: 500 },
        );
      }

      if (!users || users.length === 0) {
        hasMore = false;
        break;
      }

      for (const user of users) {
        // Skip unconfirmed users
        if (!user.email_confirmed_at) {
          skipped++;
          continue;
        }

        const role = user.user_metadata?.role;

        if (role === "employer") {
          const result = await enqueueEmployerWelcome(supabase, user);
          if (result !== "skipped") processed_employers++;
        } else {
          // role undefined or 'candidate'
          const result = await enqueueCandidateWelcome(supabase, user);
          if (result !== "skipped") processed_candidates++;
        }
      }

      hasMore = users.length === 50;
      page++;
    }

    // Note: processed counts include both new inserts and deduped no-ops.
    // Actual new enqueues are a subset. This is by design — idempotency
    // means most runs process many users but enqueue few.
    return new Response(
      JSON.stringify({
        ok: true,
        processed_candidates,
        processed_employers,
        skipped,
        pages_scanned: page - 1,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("email-reconcile error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500 },
    );
  }
});

// ─── Candidate Welcome ──────────────────────────────

interface AuthUser {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
}

type EnqueueResult = "enqueued" | "duplicate" | "skipped";

async function enqueueCandidateWelcome(
  supabase: ReturnType<typeof createClient>,
  user: AuthUser,
): Promise<EnqueueResult> {
  const { data: cand } = await supabase
    .from("candidates")
    .select("full_name, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cand) return "skipped";

  const { error } = await supabase.from("email_outbox").upsert(
    {
      dedupe_key: `candidate_welcome:${user.id}`,
      email_type: "candidate_welcome",
      recipient_email: cand.email || user.email || "",
      source_table: "auth.users",
      source_id: user.id,
      payload: {
        full_name: cand.full_name || null,
        cta_url: "https://hellotalent.ai/giris.html",
        email: cand.email || user.email || null,
      },
    },
    { onConflict: "dedupe_key", ignoreDuplicates: true },
  );

  if (error) {
    console.error("candidate enqueue error:", error.message);
    return "skipped";
  }

  return "enqueued";
}

// ─── Employer Welcome ───────────────────────────────

async function enqueueEmployerWelcome(
  supabase: ReturnType<typeof createClient>,
  user: AuthUser,
): Promise<EnqueueResult> {
  const { data: hr } = await supabase
    .from("hr_profiles")
    .select("ad, soyad, email, company_id, companies(company_name)")
    .eq("id", user.id)
    .maybeSingle();

  if (!hr) return "skipped";

  // Derive full_name from ad + soyad
  const fullName =
    [hr.ad, hr.soyad].filter(Boolean).join(" ").trim() || null;

  // company_name from joined companies table
  const companyName =
    (hr.companies as { company_name?: string } | null)?.company_name || null;

  const { error } = await supabase.from("email_outbox").upsert(
    {
      dedupe_key: `employer_welcome:${user.id}`,
      email_type: "employer_welcome",
      recipient_email: hr.email || user.email || "",
      source_table: "auth.users",
      source_id: user.id,
      payload: {
        full_name: fullName,
        cta_url: "https://hellotalent.ai/giris.html?tab=ik",
        company_name: companyName,
        email: hr.email || user.email || null,
      },
    },
    { onConflict: "dedupe_key", ignoreDuplicates: true },
  );

  if (error) {
    console.error("employer enqueue error:", error.message);
    return "skipped";
  }

  return "enqueued";
}
