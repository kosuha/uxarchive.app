-- Migration: V2.1 Schema Foundation
-- Description: Establishes the new Repository -> Folder -> Asset hierarchy and Snapshot system.
-- Note: V2.1 tables start empty and coexist with legacy tables (patterns, captures, etc.)

-- 1. repositories
CREATE TABLE IF NOT EXISTS public.repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL, -- Assuming workspace linkage is still required, though not explicitly detained in legacy
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. repository_folders (Renamed from folders to avoid conflict)
CREATE TABLE IF NOT EXISTS public.repository_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.repository_folders(id) ON DELETE CASCADE, -- Recursive constraint
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0, -- Quoted order as it's a keyword
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. assets
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES public.repository_folders(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    meta JSONB DEFAULT '{}'::jsonb, -- Includes insights, etc.
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. repository_snapshots
CREATE TABLE IF NOT EXISTS public.repository_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
    version_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. snapshot_items
-- Stores the flattened or structural state of a snapshot
CREATE TABLE IF NOT EXISTS public.snapshot_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES public.repository_snapshots(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('folder', 'asset')),
    original_item_id UUID, -- Reference to the original item ID (can be null if original is deleted, but useful for history)
    parent_snapshot_item_id UUID REFERENCES public.snapshot_items(id) ON DELETE CASCADE, -- Reconstruct hierarchy within snapshot
    item_data JSONB NOT NULL -- Stores name, meta, storage_path, etc. at time of snapshot
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_repositories_workspace_id ON public.repositories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_repository_folders_repository_id ON public.repository_folders(repository_id);
CREATE INDEX IF NOT EXISTS idx_repository_folders_parent_id ON public.repository_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_assets_folder_id ON public.assets(folder_id);
CREATE INDEX IF NOT EXISTS idx_repository_snapshots_repository_id ON public.repository_snapshots(repository_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_items_snapshot_id ON public.snapshot_items(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_items_parent_snapshot_item_id ON public.snapshot_items(parent_snapshot_item_id);

-- Enable RLS (Default deny, policies to be added later or now?)
-- For now, enabling RLS to be safe, but we need policies for access.
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_items ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Placeholder - adjust based on auth needs)
-- Assuming authenticated users can CRUD their own workspace data (need workspace_id linkage for all)
-- Use a simple policy for development/testing if user is authenticated
CREATE POLICY "Enable all access for authenticated users" ON public.repositories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.repository_folders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.assets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.repository_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.snapshot_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow public read if repository is public (for repositories table)
CREATE POLICY "Allow public read for public repositories" ON public.repositories FOR SELECT USING (is_public = true);
-- For folders/assets, we need to join with repositories to check is_public.
-- This can be complex with RLS. For now, authenticated access is the priority.
