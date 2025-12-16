-- Migration: Fix Storage RLS for ux-archive-captures
-- Description: Enables RLS on storage.objects and adds policies for the assets storage path.

BEGIN;

-- 1. Drop existing policies if any to avoid conflicts
-- We use diverse names to try and catch common existing ones, or just rely on the new ones working side-by-side if names differ.
-- But cleanest is to drop if we know the names. Since we don't, we will just create new ones with specific names.

-- 2. Create Policies

-- INSERT: Allow authenticated users to upload to 'assets/*' folder in 'ux-archive-captures' bucket
CREATE POLICY "Allow authenticated uploads to assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ux-archive-captures' AND
  (name LIKE 'assets/%')
);

-- SELECT: Allow authenticated users to read files in the bucket (needed for API access)
CREATE POLICY "Allow authenticated reads for assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ux-archive-captures'
);

-- UPDATE: Allow authenticated users to update files in assets/
CREATE POLICY "Allow authenticated updates for assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ux-archive-captures' AND
  (name LIKE 'assets/%')
);

-- DELETE: Allow authenticated users to delete files in assets/
CREATE POLICY "Allow authenticated deletes for assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ux-archive-captures' AND
  (name LIKE 'assets/%')
);

-- 3. Ensure bucket is public (so we can use public URLs in the frontend)
UPDATE storage.buckets
SET public = true
WHERE id = 'ux-archive-captures';

COMMIT;
