-- Migration: Add Repository Likes System
-- Description: Adds like_count to repositories, creates repository_likes table, and adds toggle RPC.

-- 1. Add like_count to repositories
ALTER TABLE public.repositories 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0 NOT NULL;

-- 2. Create repository_likes table
CREATE TABLE IF NOT EXISTS public.repository_likes (
    repository_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (repository_id, user_id)
);

-- 3. Enable RLS on repository_likes
ALTER TABLE public.repository_likes ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for repository_likes
DROP POLICY IF EXISTS "Users can view all repository likes" ON public.repository_likes;
CREATE POLICY "Users can view all repository likes"
    ON public.repository_likes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can toggle their own repository likes" ON public.repository_likes;
CREATE POLICY "Users can toggle their own repository likes"
    ON public.repository_likes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. RPC to toggle repository like
CREATE OR REPLACE FUNCTION public.toggle_repository_like(p_repository_id UUID)
RETURNS boolean -- Returns true if liked, false if unliked
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_liked boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.repository_likes WHERE repository_id = p_repository_id AND user_id = v_user_id) THEN
    DELETE FROM public.repository_likes WHERE repository_id = p_repository_id AND user_id = v_user_id;
    UPDATE public.repositories SET like_count = like_count - 1 WHERE id = p_repository_id;
    v_liked := false;
  ELSE
    INSERT INTO public.repository_likes (repository_id, user_id) VALUES (p_repository_id, v_user_id);
    UPDATE public.repositories SET like_count = like_count + 1 WHERE id = p_repository_id;
    v_liked := true;
  END IF;

  RETURN v_liked;
END;
$$;
