ALTER TABLE public.vehicle_appraisals ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Allow authenticated users to manage photos in appraisals/ folder of vehicle-images bucket
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Auth can upload appraisal photos') THEN
    CREATE POLICY "Auth can upload appraisal photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-images' AND (storage.foldername(name))[1] = 'appraisals');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Auth can update appraisal photos') THEN
    CREATE POLICY "Auth can update appraisal photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'vehicle-images' AND (storage.foldername(name))[1] = 'appraisals');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Auth can delete appraisal photos') THEN
    CREATE POLICY "Auth can delete appraisal photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vehicle-images' AND (storage.foldername(name))[1] = 'appraisals');
  END IF;
END $$;