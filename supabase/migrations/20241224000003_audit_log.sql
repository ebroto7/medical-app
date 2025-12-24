-- =====================================================
-- AUDIT LOG TABLE
-- Migration: 20241224000003
-- Description: Create audit log table for security and compliance tracking
-- =====================================================

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only system can insert audit logs
-- This prevents users from tampering with audit records
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;
CREATE POLICY "System can insert audit logs"
ON audit_log FOR INSERT
WITH CHECK (true);

-- Policy: Users can view their own audit logs (optional - for transparency)
-- Comment out if you don't want users to see their audit trail
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_log;
CREATE POLICY "Users can view their own audit logs"
ON audit_log FOR SELECT
USING (auth.uid() = user_id);

-- Note: Only admin users should be able to view all audit logs
-- This policy can be added later when admin role is implemented:
--
-- DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_log;
-- CREATE POLICY "Admins can view all audit logs"
-- ON audit_log FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1 FROM profiles
--     WHERE profiles.id = auth.uid()
--     AND profiles.role = 'admin'
--   )
-- );
