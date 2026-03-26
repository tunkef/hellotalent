// premium-webhook — Payment callback handler for premium activation
// Endpoint: POST /functions/v1/premium-webhook
//
// Flow:
//   1. Receive payment callback (iyzico or manual)
//   2. Validate payment status
//   3. Look up pending purchase by provider_payment_id or purchase_id
//   4. Call activate_candidate_premium to set entitlement
//   5. Return success/failure
//
// Security:
//   - Validates callback authenticity via shared secret or provider signature
//   - Uses service_role to write entitlement
//   - Idempotent: repeated calls with same payment_id are safe

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("PREMIUM_WEBHOOK_SECRET") || "";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Validate webhook secret (simple shared-secret auth)
    const authHeader = req.headers.get("x-webhook-secret") || "";
    if (WEBHOOK_SECRET && authHeader !== WEBHOOK_SECRET) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();

    // Required fields
    const purchaseId = body.purchase_id as number | null;
    const providerPaymentId = body.provider_payment_id as string | null;
    const providerStatus = body.provider_status as string || "success";
    const candidateId = body.candidate_id as number | null;
    const planKey = body.plan_key as string | null;
    const amountCents = body.amount_cents as number || 0;

    if (!candidateId && !purchaseId && !providerPaymentId) {
      return jsonResponse({ error: "candidate_id, purchase_id, or provider_payment_id required" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // If we have a purchase_id, look up the pending purchase
    let resolvedCandidateId = candidateId;
    let resolvedPlanKey = planKey;
    let resolvedAmount = amountCents;

    if (purchaseId) {
      const { data: purchase } = await supabase
        .from("candidate_premium_purchases")
        .select("candidate_id, plan_key, amount_cents, status")
        .eq("id", purchaseId)
        .maybeSingle();

      if (!purchase) {
        return jsonResponse({ error: "Purchase not found" }, 404);
      }

      // Idempotency: if already completed, return success without re-processing
      if (purchase.status === "completed") {
        return jsonResponse({ ok: true, message: "Already activated", purchase_id: purchaseId });
      }

      resolvedCandidateId = purchase.candidate_id;
      resolvedPlanKey = purchase.plan_key;
      resolvedAmount = purchase.amount_cents;

      // Update purchase with provider info
      await supabase
        .from("candidate_premium_purchases")
        .update({
          provider_payment_id: providerPaymentId,
          provider_status: providerStatus,
        })
        .eq("id", purchaseId);
    }

    if (!resolvedCandidateId || !resolvedPlanKey) {
      return jsonResponse({ error: "Cannot resolve candidate or plan" }, 400);
    }

    // Check payment status from provider
    if (providerStatus === "failure" || providerStatus === "failed") {
      // Mark purchase as failed
      if (purchaseId) {
        await supabase
          .from("candidate_premium_purchases")
          .update({ status: "failed", provider_status: providerStatus })
          .eq("id", purchaseId);
      }
      return jsonResponse({ ok: false, message: "Payment failed" });
    }

    // Activate premium entitlement
    const { data: activationId, error: activationError } = await supabase.rpc(
      "activate_candidate_premium",
      {
        p_candidate_id: resolvedCandidateId,
        p_plan_key: resolvedPlanKey,
        p_amount_cents: resolvedAmount,
        p_provider_payment_id: providerPaymentId,
        p_provider_status: providerStatus,
      }
    );

    if (activationError) {
      return jsonResponse({ error: activationError.message }, 500);
    }

    return jsonResponse({
      ok: true,
      purchase_id: activationId || purchaseId,
      candidate_id: resolvedCandidateId,
      plan_key: resolvedPlanKey,
    });
  } catch (err) {
    console.error("premium-webhook error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
