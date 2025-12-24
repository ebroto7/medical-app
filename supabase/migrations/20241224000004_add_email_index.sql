-- =====================================================
-- ADD EMAIL INDEX FOR FAST LOOKUPS
-- =====================================================
-- This migration adds an index on the email column in the profiles table
-- to optimize email lookups (O(1) instead of O(n)) and prevent user enumeration attacks

-- Add index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add comment explaining the purpose
COMMENT ON INDEX idx_profiles_email IS 'Index for fast email lookups in patient search, prevents O(n) admin.listUsers() calls';
