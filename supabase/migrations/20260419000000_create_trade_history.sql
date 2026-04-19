-- Create trade_history table
CREATE TABLE IF NOT EXISTS trade_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mt5_id text NOT NULL,
  ticket text NOT NULL UNIQUE,
  symbol text NOT NULL,
  type text NOT NULL,
  volume numeric NOT NULL,
  open_price numeric NOT NULL,
  close_price numeric NOT NULL,
  profit numeric NOT NULL,
  open_time timestamptz NOT NULL,
  close_time timestamptz NOT NULL,
  magic numeric,
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own trade history"
  ON trade_history FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trading_accounts
    WHERE trading_accounts.mt5_login = trade_history.mt5_id
    AND trading_accounts.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all trade history"
  ON trade_history FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_history_mt5_id ON trade_history(mt5_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_ticket ON trade_history(ticket);
CREATE INDEX IF NOT EXISTS idx_trade_history_close_time ON trade_history(close_time);
