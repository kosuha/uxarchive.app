-- Migration: Add Initial Skeleton Repository with Folders
-- Description: Ensures every user has a 'General' repository with default folders.
--              Includes a backfill for existing users.

-- 1. Create or Replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_repo_id UUID;
BEGIN
  -- Insert a default 'General' repository for the new user
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

-- 2. Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill/Update for existing users
DO $$
DECLARE
  user_rec RECORD;
  repo_id UUID;
BEGIN
  FOR user_rec IN SELECT id FROM auth.users LOOP
    -- Check if General repo exists, if not create it
    SELECT id INTO repo_id FROM public.repositories WHERE workspace_id = user_rec.id AND name = 'General' LIMIT 1;
    
    IF repo_id IS NULL THEN
      INSERT INTO public.repositories (workspace_id, name, description, is_public)
      VALUES (user_rec.id, 'General', 'Your default repository', false)
      RETURNING id INTO repo_id;
    END IF;

    -- Ensure folders exist for this repository
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
