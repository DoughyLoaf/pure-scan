
CREATE OR REPLACE FUNCTION public.increment_session_scan(p_session_id text, p_flagged_count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sessions
  SET scan_count = scan_count + 1,
      total_ingredients_flagged = total_ingredients_flagged + p_flagged_count,
      last_active_at = now()
  WHERE session_id = p_session_id;
END;
$$;
