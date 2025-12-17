-- Add tags column to repository_snapshots
-- This stores a JSON array of tags: [{ id, name, color }, ...]
alter table public.repository_snapshots
add column if not exists tags jsonb;

-- Note: Validation of json structure is up to the application, 
-- but we could add a check constraint if strict validation was needed.
-- For now, flexible jsonb is fine.
