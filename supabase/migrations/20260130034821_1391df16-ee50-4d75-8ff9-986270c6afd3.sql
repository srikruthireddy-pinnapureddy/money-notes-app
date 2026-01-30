-- Drop the overly permissive receipts policy that allows any authenticated user to view any receipt
DROP POLICY IF EXISTS "Users can view receipts" ON storage.objects;