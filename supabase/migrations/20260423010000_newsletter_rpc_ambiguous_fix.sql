-- Hotfix: admin_list_newsletter_subscribers — audience column ambiguous
-- Root: RETURNS TABLE (... audience text ...) adds `audience` to function scope;
-- inside CTE, `audience = p_audience` ambiguous with outer column ref.
-- Fix: explicit table qualifier in WHERE clause (newsletter_subscribers.audience).

CREATE OR REPLACE FUNCTION public.admin_list_newsletter_subscribers(
  p_audience text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_email_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, email citext, audience text, status text, source text,
  confirmed_at timestamptz, unsubscribed_at timestamptz,
  bounce_count int, last_sent_at timestamptz, created_at timestamptz,
  total_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin_only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT ns.id, ns.email, ns.audience, ns.status, ns.source,
           ns.confirmed_at, ns.unsubscribed_at,
           ns.bounce_count, ns.last_sent_at, ns.created_at
    FROM public.newsletter_subscribers ns
    WHERE (p_audience IS NULL OR ns.audience = p_audience)
      AND (p_status IS NULL OR ns.status = p_status)
      AND (p_email_search IS NULL OR ns.email ILIKE '%' || p_email_search || '%')
  ),
  counted AS (
    SELECT COUNT(*) AS total FROM filtered
  )
  SELECT f.id, f.email, f.audience, f.status, f.source,
         f.confirmed_at, f.unsubscribed_at,
         f.bounce_count, f.last_sent_at, f.created_at,
         c.total
  FROM filtered f, counted c
  ORDER BY f.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_list_newsletter_subscribers TO authenticated;
