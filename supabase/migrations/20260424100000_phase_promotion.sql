-- Phase promotion function: advances a trading account to its next phase
-- Called by admin when approving an evaluation review

CREATE OR REPLACE FUNCTION promote_account_phase(p_review_id uuid, p_admin_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review evaluation_reviews%ROWTYPE;
  v_account trading_accounts%ROWTYPE;
  v_max_phase integer;
BEGIN
  -- Admin check
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get the review
  SELECT * INTO v_review FROM evaluation_reviews WHERE id = p_review_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found';
  END IF;
  IF v_review.status != 'pending' THEN
    RAISE EXCEPTION 'Review is not pending (current status: %)', v_review.status;
  END IF;

  -- Get the trading account
  SELECT * INTO v_account FROM trading_accounts WHERE id = v_review.account_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trading account not found';
  END IF;

  -- Determine max phases for this model
  -- instant=1 (always funded), 1_step=2 (phase1 + funded), 2_step=3 (phase1 + phase2 + funded)
  v_max_phase := CASE v_account.model_type
    WHEN 'instant' THEN 1
    WHEN '1_step' THEN 2
    WHEN '2_step' THEN 3
    ELSE 1
  END;

  -- Can't promote beyond max
  IF v_account.current_phase >= v_max_phase THEN
    RAISE EXCEPTION 'Account is already at maximum phase (funded)';
  END IF;

  -- Advance the phase
  UPDATE trading_accounts
  SET current_phase = current_phase + 1,
      updated_at = now()
  WHERE id = v_account.id;

  -- Update the review
  UPDATE evaluation_reviews
  SET status = 'approved',
      admin_notes = COALESCE(p_admin_notes, admin_notes),
      updated_at = now()
  WHERE id = p_review_id;
END;
$$;

-- Reject function
CREATE OR REPLACE FUNCTION reject_evaluation_review(p_review_id uuid, p_admin_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE evaluation_reviews
  SET status = 'rejected',
      admin_notes = COALESCE(p_admin_notes, admin_notes),
      updated_at = now()
  WHERE id = p_review_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found or not pending';
  END IF;
END;
$$;
