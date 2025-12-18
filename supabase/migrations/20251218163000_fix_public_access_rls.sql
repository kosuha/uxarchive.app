-- Migration: Fix Public Access RLS
-- Description: Adds "Public Read" policies for V2.1 tables so anonymous users can view content of public repositories.

BEGIN;

-- 1. repository_folders
CREATE POLICY "Allow public read for folders in public repositories"
ON public.repository_folders
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.repositories
    WHERE repositories.id = repository_folders.repository_id
    AND repositories.is_public = true
  )
);

-- 2. assets
-- We use repository_id which should be populated for all assets now.
CREATE POLICY "Allow public read for assets in public repositories"
ON public.assets
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.repositories
    WHERE repositories.id = assets.repository_id
    AND repositories.is_public = true
  )
);

-- 3. repository_snapshots
CREATE POLICY "Allow public read for snapshots in public repositories"
ON public.repository_snapshots
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.repositories
    WHERE repositories.id = repository_snapshots.repository_id
    AND repositories.is_public = true
  )
);

-- 4. snapshot_items
CREATE POLICY "Allow public read for snapshot items in public snapshots"
ON public.snapshot_items
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.repository_snapshots
    JOIN public.repositories ON repositories.id = repository_snapshots.repository_id
    WHERE repository_snapshots.id = snapshot_items.snapshot_id
    AND repositories.is_public = true
  )
);

COMMIT;
