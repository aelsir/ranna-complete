-- Storage Buckets Setup
-- Run this in your Supabase SQL Editor AFTER creating the buckets in the dashboard

-- First, create the buckets in Supabase Dashboard:
-- 1. Go to Storage > New Bucket
-- 2. Create "audio" bucket (public)
-- 3. Create "images" bucket (public)

-- Then run these policies:

-- Allow public read for audio
CREATE POLICY "Public audio access" ON storage.objects
  FOR SELECT USING (bucket_id = 'audio');

-- Authenticated users can upload audio
CREATE POLICY "Authenticated audio upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'audio' AND auth.uid() IS NOT NULL);

-- Authenticated users can update their audio
CREATE POLICY "Authenticated audio update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'audio' AND auth.uid() IS NOT NULL);

-- Authenticated users can delete their audio
CREATE POLICY "Authenticated audio delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'audio' AND auth.uid() IS NOT NULL);

-- Allow public read for images
CREATE POLICY "Public images access" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

-- Authenticated users can upload images
CREATE POLICY "Authenticated images upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.uid() IS NOT NULL);

-- Authenticated users can update their images
CREATE POLICY "Authenticated images update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'images' AND auth.uid() IS NOT NULL);

-- Authenticated users can delete their images
CREATE POLICY "Authenticated images delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'images' AND auth.uid() IS NOT NULL);
