/*
  # Admin Dashboard Statistics
  
  1. Changes
    - Create admin_dashboard_stats table for caching statistics
    - Create function to refresh dashboard statistics
    - Create function to get recent activity
    - Add appropriate security policies
*/

-- Create table for dashboard statistics
CREATE TABLE IF NOT EXISTS admin_dashboard_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_users integer DEFAULT 0,
  active_accounts integer DEFAULT 0,
  pending_approvals integer DEFAULT 0,
  monthly_revenue numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_dashboard_stats ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admins can view dashboard stats"
  ON admin_dashboard_stats FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create function to refresh dashboard stats
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
DECLARE
  stats_id uuid;
BEGIN
  -- Get or create stats record
  SELECT id INTO stats_id FROM admin_dashboard_stats LIMIT 1;
  IF stats_id IS NULL THEN
    INSERT INTO admin_dashboard_stats DEFAULT VALUES RETURNING id INTO stats_id;
  END IF;

  -- Update stats
  UPDATE admin_dashboard_stats
  SET
    total_users = (
      SELECT count(*) FROM profiles
    ),
    active_accounts = (
      SELECT count(*) FROM trading_accounts WHERE status = 'active'
    ),
    pending_approvals = (
      SELECT count(*) 
      FROM account_purchases 
      WHERE status = 'payment_submitted'
    ),
    monthly_revenue = (
      SELECT COALESCE(sum(amount), 0)
      FROM account_purchases
      WHERE status = 'payment_verified'
      AND created_at >= date_trunc('month', now())
    ),
    updated_at = now()
  WHERE id = stats_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get recent activity
CREATE OR REPLACE FUNCTION get_recent_activity()
RETURNS TABLE (
  id uuid,
  admin_name text,
  action text,
  entity_type text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aal.id,
    p.name as admin_name,
    aal.action,
    aal.entity_type,
    aal.created_at
  FROM admin_activity_log aal
  JOIN profiles p ON p.id = aal.admin_id
  ORDER BY aal.created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to refresh stats automatically
CREATE OR REPLACE FUNCTION refresh_stats_on_change()
RETURNS trigger AS $$
BEGIN
  PERFORM refresh_dashboard_stats();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for stats refresh
DROP TRIGGER IF EXISTS refresh_stats_on_account_change ON trading_accounts;
DROP TRIGGER IF EXISTS refresh_stats_on_purchase_change ON account_purchases;

CREATE TRIGGER refresh_stats_on_account_change
  AFTER INSERT OR UPDATE OR DELETE ON trading_accounts
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_stats_on_change();

CREATE TRIGGER refresh_stats_on_purchase_change
  AFTER INSERT OR UPDATE OR DELETE ON account_purchases
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_stats_on_change();

-- Initial stats refresh
SELECT refresh_dashboard_stats();