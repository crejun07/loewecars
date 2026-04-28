-- Create public bucket for vehicle images
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-images', 'vehicle-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Vehicle images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-images');

-- Public upload
CREATE POLICY "Anyone can upload vehicle images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vehicle-images');

-- Public update
CREATE POLICY "Anyone can update vehicle images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'vehicle-images');

-- Public delete
CREATE POLICY "Anyone can delete vehicle images"
ON storage.objects FOR DELETE
USING (bucket_id = 'vehicle-images');