-- Self-service "forgot password" support. We store a HASH of the reset
-- token (never the raw token itself), same principle as password_hash —
-- if the database were ever compromised, raw tokens couldn't be replayed.

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
