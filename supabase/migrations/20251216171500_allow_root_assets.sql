-- Migration: Allow Root Level Assets
-- Description: Modifies assets table to allow assets to belong directly to a repository without a folder.

-- 1. Add repository_id column
ALTER TABLE public.assets 
ADD COLUMN repository_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE;

-- 2. Populate repository_id for existing assets (via folder linkage)
UPDATE public.assets a
SET repository_id = f.repository_id
FROM public.repository_folders f
WHERE a.folder_id = f.id;

-- 3. Make folder_id nullable
ALTER TABLE public.assets 
ALTER COLUMN folder_id DROP NOT NULL;

-- 4. Add constraint to ensure at least one parent exists
ALTER TABLE public.assets
ADD CONSTRAINT assets_parent_check 
CHECK (
    (folder_id IS NOT NULL) OR (repository_id IS NOT NULL)
);

-- 5. Index on repository_id
CREATE INDEX idx_assets_repository_id ON public.assets(repository_id);
