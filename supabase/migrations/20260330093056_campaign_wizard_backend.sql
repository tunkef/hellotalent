-- T12 — Campaign Wizard Backend (patch)
-- Tables, enums, RLS, triggers, and bucket were already deployed.
-- This migration adds the missing employer DELETE policy for draft campaigns.

CREATE POLICY campaigns_employer_delete ON campaigns
  FOR DELETE USING (
    status = 'draft'
    AND company_id IN (
      SELECT hp.company_id FROM hr_profiles hp WHERE hp.id = auth.uid()
    )
  );
