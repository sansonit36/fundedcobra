-- Add avatar_url to trader_profiles to bypass strict profiles RLS
ALTER TABLE trader_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Backfill from profiles table
UPDATE trader_profiles tp
SET avatar_url = p.avatar_url
FROM profiles p
WHERE tp.id = p.id AND p.avatar_url IS NOT NULL;
