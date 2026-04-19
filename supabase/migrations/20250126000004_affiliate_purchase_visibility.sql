-- Add an RLS policy so affiliates can view the account requests of their referred users.
-- This uses the affiliate_referrals ledger to give retroactive access to legacy purchases, instantly fixing the $0 bug.

DROP POLICY IF EXISTS "Affiliates can view their referrals' purchases" ON account_requests;

CREATE POLICY "Affiliates can view their referrals' purchases"
  ON account_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_referrals
      WHERE referrer_id = auth.uid()
      AND referred_id = account_requests.user_id
    )
  );
