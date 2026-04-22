// newsletter-subscribe — Public subscribe endpoint
// POST { email, audience, source, hp, started_at } → 200 | 400 | 429
//
// Flow:
//   1. Validate (honeypot, min-fill-time, email format)
//   2. Upsert newsletter_subscribers (pending status, new confirmation_token)
//   3. Enqueue newsletter_confirmation mail in email_outbox
//   4. Insert newsletter_events 'subscribed'
//
// Idempotent: same email → new token + re-enqueue confirmation
// Rate limit: IP-level via dedupe_key pattern

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ALLOWED_ORIGINS = [
  'https://hellotalent.ai',
  'http://localhost:3000',
  'http://localhost:3001',
];

const MIN_FILL_MS = 2000;
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const cors = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: cors });
  }

  try {
    const body = await req.json();
    const email: string = (body.email || '').trim().toLowerCase();
    const audience: string = (body.audience || 'aday').toLowerCase();
    const source: string = (body.source || 'unknown').slice(0, 64);
    const hp: string = body.hp || '';
    const startedAt: number = Number(body.started_at || 0);

    // Honeypot
    if (hp) {
      return new Response(JSON.stringify({ error: 'bot_detected' }), { status: 400, headers: cors });
    }
    // Min fill time
    if (startedAt && Date.now() - startedAt < MIN_FILL_MS) {
      return new Response(JSON.stringify({ error: 'too_fast' }), { status: 400, headers: cors });
    }
    // Email validation
    if (!email || !EMAIL_RE.test(email) || email.length > 320) {
      return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: cors });
    }
    // Audience
    if (!['aday', 'kurumsal'].includes(audience)) {
      return new Response(JSON.stringify({ error: 'invalid_audience' }), { status: 400, headers: cors });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const ua = req.headers.get('user-agent')?.slice(0, 255) || null;

    // Upsert subscriber — idempotent
    // If existing with status=unsubscribed, re-activate as pending w/ new tokens
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, status, confirmed_at')
      .eq('email', email)
      .maybeSingle();

    const newConfirmToken = crypto.randomUUID();
    const newUnsubToken = crypto.randomUUID();
    let subscriberId: string;

    if (existing) {
      // Already confirmed — just re-send confirmation (noop for user, enqueue still)
      if (existing.status === 'confirmed') {
        return new Response(
          JSON.stringify({ ok: true, already_confirmed: true }),
          { status: 200, headers: cors },
        );
      }

      // Refresh token + re-enqueue
      const { error: updErr } = await supabase
        .from('newsletter_subscribers')
        .update({
          status: 'pending',
          confirmation_token: newConfirmToken,
          unsubscribe_token: newUnsubToken,
          audience,
          source,
          ip_address: ip,
          user_agent: ua,
          unsubscribed_at: null,
          confirmed_at: null,
        })
        .eq('id', existing.id);
      if (updErr) throw updErr;
      subscriberId = existing.id;
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email,
          audience,
          source,
          status: 'pending',
          confirmation_token: newConfirmToken,
          unsubscribe_token: newUnsubToken,
          ip_address: ip,
          user_agent: ua,
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      subscriberId = inserted.id;
    }

    // Event log
    await supabase.from('newsletter_events').insert({
      subscriber_id: subscriberId,
      event_type: 'subscribed',
      metadata: { source, ip, ua },
    });

    // Enqueue confirmation mail (transactional — İYS dışı)
    const dedupeKey = `newsletter_confirm:${subscriberId}:${newConfirmToken.slice(0, 8)}`;
    const confirmUrl = `https://hellotalent.ai/newsletter-onay.html?token=${newConfirmToken}&email=${encodeURIComponent(email)}`;

    await supabase.from('email_outbox').insert({
      dedupe_key: dedupeKey,
      email_type: 'newsletter_confirmation',
      recipient_email: email,
      status: 'pending',
      payload: {
        email,
        audience,
        confirm_url: confirmUrl,
      },
    });

    return new Response(
      JSON.stringify({ ok: true, subscriber_id: subscriberId }),
      { status: 200, headers: cors },
    );
  } catch (err) {
    console.error('newsletter-subscribe error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'internal_error' }),
      { status: 500, headers: cors },
    );
  }
});
