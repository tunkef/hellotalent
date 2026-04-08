-- ═══════════════════════════════════════════════════════════════
-- Migration: Strip PII from employer-facing search RPC
-- Date: 2026-04-08
-- Security: Employer should NOT see candidate email/telefon via API.
-- Card UI already masks these, but API response was unfiltered.
--
-- Strategy: Wrap search_employer_candidates with a view layer that
-- nullifies PII fields. Since the function returns JSONB, we
-- create a wrapper that strips telefon/email from the response.
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Rename current function to _internal
ALTER FUNCTION search_employer_candidates(jsonb, bigint, text, int, int, bigint)
  RENAME TO _search_employer_candidates_internal;

-- Step 2: Create wrapper that strips PII
CREATE OR REPLACE FUNCTION search_employer_candidates(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_employer_company_id bigint DEFAULT NULL,
  p_sort text DEFAULT 'relevance',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_position_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw jsonb;
  v_candidates jsonb;
  v_stripped jsonb;
  v_item jsonb;
  i int;
BEGIN
  -- Call internal function
  v_raw := _search_employer_candidates_internal(
    p_filters, p_employer_company_id, p_sort, p_limit, p_offset, p_position_id
  );

  -- Strip telefon and email from each candidate in the results array
  v_candidates := v_raw -> 'candidates';
  IF v_candidates IS NOT NULL AND jsonb_typeof(v_candidates) = 'array' THEN
    v_stripped := '[]'::jsonb;
    FOR i IN 0 .. jsonb_array_length(v_candidates) - 1 LOOP
      v_item := v_candidates -> i;
      v_item := v_item - 'telefon' - 'email';
      v_stripped := v_stripped || jsonb_build_array(v_item);
    END LOOP;
    v_raw := jsonb_set(v_raw, '{candidates}', v_stripped);
  END IF;

  RETURN v_raw;
END;
$$;

-- Grant execute to authenticated (same as original)
GRANT EXECUTE ON FUNCTION search_employer_candidates(jsonb, bigint, text, int, int, bigint) TO authenticated;
