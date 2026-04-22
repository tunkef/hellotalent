// newsletter-unsubscribe — Public 1-click unsubscribe
// GET ?token=<uuid> → 302 redirect to /newsletter-tercih.html?unsub=1
// POST (RFC 8058 List-Unsubscribe-Post: List-Unsubscribe=One-Click)
//   → JSON { ok: true }
//
// Both GET + POST update status='unsubscribed', insert iys_sync_queue remove.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LANDING = 'https://hellotalent.ai/newsletter-tercih.html';

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const method = req.method;
  let token = url.searchParams.get('token') || '';

  if (method === 'POST') {
    try {
      const body = await req.json().catch(() => ({}));
      if (!token) token = body.token || '';
    } catch { /* ignore */ }
  } else if (method !== 'GET') {
    return new Response('method_not_allowed', { status: 405 });
  }

  const redirect = (to: string) =>
    new Response(null, { status: 302, headers: { Location: to } });

  if (!token || token.length !== 36) {
    return method === 'POST'
      ? new Response(JSON.stringify({ error: 'invalid_token' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
      : redirect(LANDING + '?err=invalid_token');
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: sub } = await supabase
      .from('newsletter_subscribers')
      .select('id, status, email, audience, user_id')
      .eq('unsubscribe_token', token)
      .maybeSingle();

    if (!sub) {
      return method === 'POST'
        ? new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
        : redirect(LANDING + '?err=not_found');
    }
    if (sub.status === 'unsubscribed') {
      return method === 'POST'
        ? new Response(JSON.stringify({ ok: true, already: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        : redirect(LANDING + '?unsub=1&already=1');
    }

    const { error: updErr } = await supabase
      .from('newsletter_subscribers')
      .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
      .eq('id', sub.id);
    if (updErr) throw updErr;

    await supabase.from('iys_sync_queue').insert({
      subscriber_id: sub.id,
      action: 'remove',
      status: 'pending',
    });

    await supabase.from('newsletter_events').insert({
      subscriber_id: sub.id,
      event_type: 'unsubscribed',
      metadata: { method: method === 'POST' ? 'one_click' : 'link' },
    });

    // Sync candidate/hr_profile toggle
    if (sub.user_id) {
      if (sub.audience === 'aday') {
        await supabase
          .from('candidates')
          .update({ notify_email_newsletter: false })
          .eq('user_id', sub.user_id);
      } else if (sub.audience === 'kurumsal') {
        await supabase
          .from('hr_profiles')
          .update({ notify_email_newsletter: false })
          .eq('id', sub.user_id);
      }
    }

    return method === 'POST'
      ? new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      : redirect(LANDING + '?unsub=1&token=' + token);
  } catch (err) {
    console.error('newsletter-unsubscribe error:', err);
    return method === 'POST'
      ? new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
      : redirect(LANDING + '?err=internal_error');
  }
});
