-- Migration: Create get_orphaned_assets function for GC
-- 20251214200000_gc_orphans.sql

CREATE OR REPLACE FUNCTION get_orphaned_assets(limit_count INT DEFAULT 50)
RETURNS TABLE (id UUID, storage_path TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT sa.id, sa.storage_path
  FROM public.storage_assets sa
  LEFT JOIN public.captures c ON sa.id = c.asset_id
  WHERE c.id IS NULL
  LIMIT limit_count;
$$;
