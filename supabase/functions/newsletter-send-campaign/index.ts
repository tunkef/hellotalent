// newsletter-send-campaign — Admin-only campaign dispatcher
// POST { campaign_id } — admin JWT required
//
// Flow:
//   1. Verify JWT + is_admin() via supabase client
//   2. Call admin_send_newsletter_campaign RPC (SECURITY DEFINER)
//      → enqueues all confirmed subscribers for the audience into email_outbox
//   3. Return sent_count
//
// Actual delivery handled by email-send cron (*/1 minute).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const ALLOWED_ORIGINS = [
  'https://hellotalent.ai',
  'http://localhost:3000',
  'http://localhost:3001',
];

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const cors = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: cors });
  }

  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'missing_auth' }), { status: 401, headers: cors });
  }

  try {
    const body = await req.json();
    const campaignId: string = body.campaign_id;
    if (!campaignId) {
      return new Response(JSON.stringify({ error: 'missing_campaign_id' }), { status: 400, headers: cors });
    }

    // Client uses caller's JWT — is_admin() inside RPC enforces authorization
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc('admin_send_newsletter_campaign', {
      p_campaign_id: campaignId,
    });

    if (error) {
      const code = error.code === '42501' ? 403 : 400;
      return new Response(JSON.stringify({ error: error.message }), { status: code, headers: cors });
    }

    return new Response(
      JSON.stringify({ ok: true, enqueued: data }),
      { status: 200, headers: cors },
    );
  } catch (err) {
    console.error('newsletter-send-campaign error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'internal_error' }),
      { status: 500, headers: cors },
    );
  }
});
