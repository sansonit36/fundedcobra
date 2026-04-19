-- Completely refactoring the signup flow to be 100% synchronous and bulletproof.
-- By reading the referral code directly from the new user's metadata during creation,
-- we map the referrer instantly, eliminating race conditions and complex RPC calls.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_referral_code text;
BEGIN
  -- 1. Get the referral code safely passed from the frontend signup metadata
  v_referral_code := new.raw_user_meta_data->>'referred_by_code';

  -- 2. Find the exact referrer ID synchronously if a code exists
  IF v_referral_code IS NOT NULL THEN
    SELECT id INTO v_referrer_id
    FROM profiles
    WHERE referral_code = v_referral_code;
  END IF;

  -- 3. Insert the profile, attaching the referrer at birth
  INSERT INTO public.profiles (id, email, name, role, referred_by)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    v_referrer_id
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    referred_by = COALESCE(profiles.referred_by, EXCLUDED.referred_by), -- Preserve if already set
    updated_at = now();

  -- 4. Automatically create the affiliate ledger connection instantly
  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO public.affiliate_referrals (referrer_id, referred_id, status)
    VALUES (v_referrer_id, new.id, 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$$;
