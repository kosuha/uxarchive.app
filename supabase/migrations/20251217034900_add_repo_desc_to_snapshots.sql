-- Add repository_description column to repository_snapshots
-- This allows versioning the repository's description at the time of snapshot creation.

ALTER TABLE public.repository_snapshots 
ADD COLUMN IF NOT EXISTS repository_description TEXT;
