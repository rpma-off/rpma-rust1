-- Migration 066: Composite index for rate limiter lock-check queries.
--
-- The rate limiter queries login_attempts with WHERE identifier = ? AND is_locked = 1.
-- Migration 057 only created individual indexes on (identifier) and (last_attempt).
-- SQLite can use only one index per table scan, so the lock-check query previously
-- required a full-scan over all rows for the identifier before filtering by is_locked.
-- The composite index eliminates the filter step entirely.

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_locked
  ON login_attempts(identifier, is_locked);
