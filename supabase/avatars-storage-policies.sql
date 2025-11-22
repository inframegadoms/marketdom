-- Storage policies for avatars bucket
-- IMPORTANT: This script should be run in the Supabase SQL Editor
-- Note: Some operations may require superuser privileges
-- If you get permission errors, configure the bucket policies through the Supabase Dashboard instead

-- The storage.objects table is managed by Supabase and has RLS enabled by default
-- We only need to create policies, not enable RLS

-- 1. Public Access - Read Avatars
-- Allows anyone to view avatar images (public profiles)
-- If this policy already exists, it will show an error - that's okay, just continue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public Access - Read Avatars'
  ) THEN
    CREATE POLICY "Public Access - Read Avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;
END $$;

-- 2. Users can upload their own avatar
-- Allows authenticated users to upload images to their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload own avatar'
  ) THEN
    CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'avatars' AND
      auth.role() = 'authenticated' AND
      (storage.foldername(name))[1] = 'avatars' AND
      (storage.foldername(name))[2] = auth.uid()::text
    );
  END IF;
END $$;

-- 3. Users can update own avatar
-- Allows authenticated users to update images in their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update own avatar'
  ) THEN
    CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'avatars' AND
      auth.role() = 'authenticated' AND
      (storage.foldername(name))[1] = 'avatars' AND
      (storage.foldername(name))[2] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'avatars' AND
      auth.role() = 'authenticated' AND
      (storage.foldername(name))[1] = 'avatars' AND
      (storage.foldername(name))[2] = auth.uid()::text
    );
  END IF;
END $$;

-- 4. Users can delete own avatar
-- Allows authenticated users to delete images from their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete own avatar'
  ) THEN
    CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'avatars' AND
      auth.role() = 'authenticated' AND
      (storage.foldername(name))[1] = 'avatars' AND
      (storage.foldername(name))[2] = auth.uid()::text
    );
  END IF;
END $$;

-- Optional: Add a function to get the folder name from the path
-- This function is used in the RLS policies above.
-- Only create if it doesn't exist
CREATE OR REPLACE FUNCTION storage.foldername(path TEXT)
RETURNS TEXT[] LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN regexp_split_to_array(path, '/');
END;
$$;
