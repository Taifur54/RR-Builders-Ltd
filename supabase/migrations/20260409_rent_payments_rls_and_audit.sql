-- Add missing UPDATE policy (was entirely absent, blocking all updates via RLS)
CREATE POLICY "authenticated_update"
ON public.rent_payments
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Add audit columns for mark-as-unpaid action
ALTER TABLE public.rent_payments
  ADD COLUMN IF NOT EXISTS marked_unpaid_at timestamptz,
  ADD COLUMN IF NOT EXISTS marked_unpaid_by uuid REFERENCES public.user_profiles(id);
