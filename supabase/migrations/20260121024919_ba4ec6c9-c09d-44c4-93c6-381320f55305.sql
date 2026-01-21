-- Make receipts bucket private to prevent unauthorized access
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

-- Add RLS policy for SELECT to allow group members to view receipts for their group's expenses
CREATE POLICY "Group members can view receipts for group expenses"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM expenses e
    JOIN group_members gm ON gm.group_id = e.group_id
    WHERE gm.user_id = auth.uid()
    AND e.receipt_url LIKE '%' || name
  )
);