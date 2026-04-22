// iys-sync — İleti Yönetim Sistemi sync worker
// Schedule: */5 * * * * (every 5 minutes via pg_cron)
// Spec: docs/newsletter-iys-runbook.md
//
// Drains iys_sync_queue pending rows → İYS REST API (add/remove consent)
// Exponential backoff on failure. Idempotent via dedupe hash.
//
// Env vars required:
//   IYS_API_KEY            — İYS API key (Bearer token)
//   IYS_BRAND_CODE         — Marka kodu (kurumsal başvuru sonrası atanır)
//   IYS_API_BASE           — Base URL (default https://api.iys.org.tr/sps/)
//
// İYS API yoksa (env eksik) sessizce return — queue birikir.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const IYS_API_KEY = Deno.env.get('IYS_API_KEY') || '';
const IYS_BRAND_CODE = Deno.env.get('IYS_BRAND_CODE') || '';
const IYS_API_BASE = Deno.env.get('IYS_API_BASE') || 'https://api.iys.org.tr/sps/';

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;

Deno.serve(async (_req: Request) => {
  // İYS not configured yet — skip silently (queue accumulates)
  if (!IYS_API_KEY || !IYS_BRAND_CODE) {
    return new Response(
      JSON.stringify({ ok: true, skipped: true, reason: 'iys_not_configured' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Claim batch of pending/retry
  const { data: batch, error: claimErr } = await supabase
    .from('iys_sync_queue')
    .select('id, subscriber_id, action, attempt_count, newsletter_subscribers(email, confirmed_at, unsubscribed_at)')
    .eq('status', 'pending')
    .lte('next_retry_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (claimErr) {
    return new Response(JSON.stringify({ error: claimErr.message }), { status: 500 });
  }
  if (!batch || batch.length === 0) {
    return new Response(JSON.stringify({ ok: true, synced: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  let synced = 0;
  let failed = 0;

  for (const row of batch) {
    // Mark syncing
    await supabase
      .from('iys_sync_queue')
      .update({ status: 'syncing' })
      .eq('id', row.id);

    try {
      // deno-lint-ignore no-explicit-any
      const sub = (row as any).newsletter_subscribers;
      const email = sub?.email;
      if (!email) throw new Error('no_email');

      const consentDate =
        row.action === 'add'
          ? sub?.confirmed_at
          : sub?.unsubscribed_at || new Date().toISOString();

      // İYS API consent POST
      const endpoint = `${IYS_API_BASE.replace(/\/$/, '')}/${IYS_BRAND_CODE}/consents`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${IYS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consentDate,
          recipient: email,
          recipientType: 'BIREYSEL', // TR bireysel kişi
          source: 'HS_WEB', // HelloTalent Web signup
          status: row.action === 'add' ? 'ONAY' : 'RET',
          type: 'EPOSTA',
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`iys_${res.status}: ${errText.slice(0, 200)}`);
      }

      await supabase
        .from('iys_sync_queue')
        .update({ status: 'synced', synced_at: new Date().toISOString() })
        .eq('id', row.id);
      synced++;
    } catch (err) {
      const attempt = (row.attempt_count || 0) + 1;
      const errMsg = (err as Error).message.slice(0, 500);

      if (attempt >= MAX_ATTEMPTS) {
        await supabase
          .from('iys_sync_queue')
          .update({
            status: 'failed',
            attempt_count: attempt,
            last_error: errMsg,
          })
          .eq('id', row.id);
      } else {
        const retryMin = attempt * attempt * 5;
        const nextRetry = new Date(Date.now() + retryMin * 60 * 1000).toISOString();
        await supabase
          .from('iys_sync_queue')
          .update({
            status: 'pending',
            attempt_count: attempt,
            last_error: errMsg,
            next_retry_at: nextRetry,
          })
          .eq('id', row.id);
      }
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, synced, failed, claimed: batch.length }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
