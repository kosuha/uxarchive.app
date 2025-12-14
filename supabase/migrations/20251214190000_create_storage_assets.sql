-- Migration: Create storage_assets and refactor captures

-- 1. Create storage_assets table
CREATE TABLE IF NOT EXISTS public.storage_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_path TEXT NOT NULL,
    file_hash TEXT, -- Nullable for legacy
    file_size BIGINT,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT uq_storage_assets_path UNIQUE (storage_path)
);

-- 2. Enable RLS
ALTER TABLE public.storage_assets ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Public read access" ON public.storage_assets
    FOR SELECT USING (true);

CREATE POLICY "Authenticated insert" ON public.storage_assets
    FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Backfill from existing captures (Shim)
INSERT INTO public.storage_assets (storage_path, mime_type, width, height, created_by, created_at)
SELECT DISTINCT ON (c.storage_path)
    c.storage_path,
    c.mime_type,
    c.width,
    c.height,
    c.uploaded_by,
    c.created_at
FROM public.captures c
WHERE c.storage_path IS NOT NULL
ON CONFLICT (storage_path) DO NOTHING;

-- 5. Add asset_id to captures and link
ALTER TABLE public.captures ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.storage_assets(id);

UPDATE public.captures c
SET asset_id = sa.id
FROM public.storage_assets sa
WHERE c.storage_path = sa.storage_path;

-- 6. Add Indexes
CREATE INDEX IF NOT EXISTS idx_captures_asset_id ON public.captures(asset_id);
CREATE INDEX IF NOT EXISTS idx_storage_assets_hash ON public.storage_assets(file_hash);
