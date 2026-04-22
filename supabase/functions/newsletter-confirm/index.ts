// newsletter-confirm — Public confirmation endpoint (double opt-in)
// GET ?token=<uuid>&email=<string> → 302 redirect to /newsletter-onay.html
//
// Flow:
//   1. Validate token + email
//   2. Lookup subscriber where confirmation_token = token AND status = 'pending'
//   3. Update status='confirmed', confirmed_at=now
//   4. Enqueue iys_sync_queue (action='add')
//   5. Insert newsletter_events 'confirmed'
//   6. Redirect to success landing

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LANDING_OK = 'https://hellotalent.ai/newsletter-onay.html?ok=1';
const LANDING_ERR = 'https://hellotalent.ai/newsletter-onay.html?err=';

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return new Response('method_not_allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  const email = (url.searchParams.get('email') || '').toLowerCase();

  const redirect = (to: string) =>
    new Response(null, { status: 302, headers: { Location: to } });

  if (!token || !email || token.length !== 36) {
    return redirect(LANDING_ERR + 'invalid_token');
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: sub } = await supabase
      .from('newsletter_subscribers')
      .select('id, status, audience, user_id')
      .eq('confirmation_token', token)
      .eq('email', email)
      .maybeSingle();

    if (!sub) {
      return redirect(LANDING_ERR + 'not_found');
    }
    if (sub.status === 'confirmed') {
      return redirect(LANDING_OK);
    }
    if (sub.status !== 'pending') {
      return redirect(LANDING_ERR + 'invalid_status');
    }

    // Mark confirmed
    const { error: updErr } = await supabase
      .from('newsletter_subscribers')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', sub.id);
    if (updErr) throw updErr;

    // Queue İYS sync (add)
    await supabase.from('iys_sync_queue').insert({
      subscriber_id: sub.id,
      action: 'add',
      status: 'pending',
    });

    // Event
    await supabase.from('newsletter_events').insert({
      subscriber_id: sub.id,
      event_type: 'confirmed',
      metadata: { audience: sub.audience },
    });

    // Log newsletter_confirmed consent for logged-in users
    if (sub.user_id) {
      await supabase.from('consent_log').insert({
        user_id: sub.user_id,
        consent_type: 'newsletter_confirmed',
        granted: true,
      });
    }

    // Enqueue welcome (ticari — İYS kapsamı; İYS key yoksa iys-sync cron
    // idle, bu mail yine gönderilir ama deliverability için İYS kaydı
    // öncesi gönderim tercih edilmez. Legal hazır olduğu için enqueue OK.)
    const welcomeType =
      sub.audience === 'kurumsal'
        ? 'newsletter_welcome_kurumsal'
        : 'newsletter_welcome_aday';
    await supabase.from('email_outbox').insert({
      dedupe_key: `newsletter_welcome:${sub.id}`,
      email_type: welcomeType,
      recipient_email: email,
      status: 'pending',
      payload: {
        email,
        audience: sub.audience,
        unsubscribe_url: `https://hellotalent.ai/newsletter-tercih.html?token=${sub.id}`,
      },
    });

    return redirect(LANDING_OK);
  } catch (err) {
    console.error('newsletter-confirm error:', err);
    return redirect(LANDING_ERR + 'internal_error');
  }
});
