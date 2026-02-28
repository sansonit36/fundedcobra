/*
  # Drop Dashboard Views
  
  1. Changes
    - Drop dashboard_stats view
    - Drop recent_activity view
    - Drop associated policies
*/

-- Drop views and their policies
DROP POLICY IF EXISTS "Admins can view dashboard stats" ON dashboard_stats;
DROP POLICY IF EXISTS "Admins can view recent activity" ON recent_activity;
DROP VIEW IF EXISTS dashboard_stats;
DROP VIEW IF EXISTS recent_activity;