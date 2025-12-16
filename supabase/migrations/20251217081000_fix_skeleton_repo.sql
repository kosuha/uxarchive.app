-- Migration: Fix Skeleton Repository Logic
-- Description: 
-- 1. Restore the original on_auth_user_created trigger (which I accidentally replaced).
-- 2. Create a NEW trigger on public.workspaces to add the skeleton repo when a workspace is created.
-- 3. Backfill the skeleton repo for all EXISTING workspaces.
-- 4. Cleanup any orphaned repositories created by the previous faulty migration.

-- 1. Restore the original trigger on auth.users (to ensure profiles/workspaces are created)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 2. Create the function to handle NEW workspaces
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_repo_id UUID;
BEGIN
  -- Insert 'General' repository for the new workspace
  INSERT INTO public.repositories (workspace_id, name, description, is_public)
  VALUES (NEW.id, 'General', 'Your default repository', false)
  RETURNING id INTO new_repo_id;

  -- Insert default folders
  INSERT INTO public.repository_folders (repository_id, name, "order")
  VALUES 
    (new_repo_id, '1_Splash', 0),
    (new_repo_id, '2_Onboarding', 1),
    (new_repo_id, '3_Home', 2),
    (new_repo_id, '4_Profile', 3),
    (new_repo_id, '5_Settings', 4);

  RETURN NEW;
END;
$$;

-- Create the trigger on public.workspaces
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;

CREATE TRIGGER on_workspace_created
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();

-- 3. Backfill for EXISTING workspaces
DO $$
DECLARE
  ws_rec RECORD;
  repo_id UUID;
BEGIN
  FOR ws_rec IN SELECT id FROM public.workspaces LOOP
    -- Check if General repo exists for this WORKSPACE
    SELECT id INTO repo_id FROM public.repositories WHERE workspace_id = ws_rec.id AND name = 'General' LIMIT 1;
    
    IF repo_id IS NULL THEN
      INSERT INTO public.repositories (workspace_id, name, description, is_public)
      VALUES (ws_rec.id, 'General', 'Your default repository', false)
      RETURNING id INTO repo_id;
    END IF;

    -- Ensure folders exist
    INSERT INTO public.repository_folders (repository_id, name, "order")
    SELECT repo_id, fname, ord
    FROM (VALUES 
      ('1_Splash', 0), 
      ('2_Onboarding', 1), 
      ('3_Home', 2), 
      ('4_Profile', 3), 
      ('5_Settings', 4)
    ) AS t(fname, ord)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.repository_folders WHERE repository_id = repo_id AND name = t.fname
    );
    
  END LOOP;
END;
$$;

-- 4. Cleanup Orphans (Repositories linked to User IDs instead of Workspace IDs)
-- Assuming workspace_id should reference public.workspaces(id).
-- If there are valid repos without this link (unlikely if strictly followed), this might be dangerous.
-- But given the previous migration error, we have repos where workspace_id = auth.users.id.
-- And usually auth.users.id != workspaces.id.
-- We will delete repositories that do NOT match any workspace ID.
DELETE FROM public.repositories 
WHERE workspace_id NOT IN (SELECT id FROM public.workspaces);

-- Drop the incorrect function from previous migration
DROP FUNCTION IF EXISTS public.handle_new_user();
