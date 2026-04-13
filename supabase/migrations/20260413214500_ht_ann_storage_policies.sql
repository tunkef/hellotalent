-- K030 FAZ C storage policies — admin write on cvs/announcements/ prefix.
-- Uses existing is_admin() helper (docs/migrations/014 → admin_users table).
-- Candidates use signStorageUrl() which produces short-lived signed URLs
-- without needing a permissive SELECT policy.

DROP POLICY IF EXISTS ht_ann_storage_admin_write ON storage.objects;
CREATE POLICY ht_ann_storage_admin_write
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = 'announcements'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND is_admin()
  );

DROP POLICY IF EXISTS ht_ann_storage_admin_update ON storage.objects;
CREATE POLICY ht_ann_storage_admin_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = 'announcements'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND is_admin()
  )
  WITH CHECK (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = 'announcements'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND is_admin()
  );

DROP POLICY IF EXISTS ht_ann_storage_admin_delete ON storage.objects;
CREATE POLICY ht_ann_storage_admin_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = 'announcements'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND is_admin()
  );
