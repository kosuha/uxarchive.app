-- Migration: Add fork_origin_id to repositories
-- Description: Supports tracking where a repository was forked from.

ALTER TABLE public.repositories 
ADD COLUMN IF NOT EXISTS fork_origin_id UUID REFERENCES public.repositories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_repositories_fork_origin_id ON public.repositories(fork_origin_id);
