-- Add opened_at column to email_logs for tracking email opens
ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on opened emails
CREATE INDEX IF NOT EXISTS idx_email_logs_opened_at ON email_logs(opened_at);
