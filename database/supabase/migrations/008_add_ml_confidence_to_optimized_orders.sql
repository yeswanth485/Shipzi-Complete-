-- =============================================
-- MIGRATION 008: Add ml_confidence_pct column to optimized_orders
-- The buildOrderInsertRows function was including this field but it didn't exist
-- in the DB schema, causing ALL inserts to fail silently.
-- Adding it now for future ML enhancement data.
-- =============================================

ALTER TABLE optimized_orders
  ADD COLUMN IF NOT EXISTS ml_confidence_pct numeric;
