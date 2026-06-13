-- =============================================
-- MIGRATION 002: Align optimized_orders with
-- the required CSV input/output spec
-- =============================================

-- Add required columns to optimized_orders
ALTER TABLE optimized_orders
  ADD COLUMN IF NOT EXISTS used_box_length_cm numeric,
  ADD COLUMN IF NOT EXISTS used_box_width_cm  numeric,
  ADD COLUMN IF NOT EXISTS used_box_height_cm numeric,
  ADD COLUMN IF NOT EXISTS fragility_score     numeric,
  ADD COLUMN IF NOT EXISTS used_box_price_usd  numeric,
  ADD COLUMN IF NOT EXISTS original_box_price_usd numeric,
  ADD COLUMN IF NOT EXISTS optimized_box_price_usd numeric,
  ADD COLUMN IF NOT EXISTS fit_status          text,
  ADD COLUMN IF NOT EXISTS optimization_reason text,
  ADD COLUMN IF NOT EXISTS run_row_index       integer;

-- Index for fast run_id lookups (Orders tab)
CREATE INDEX IF NOT EXISTS idx_optimized_orders_run_id   ON optimized_orders(run_id);
CREATE INDEX IF NOT EXISTS idx_optimized_orders_company  ON optimized_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_optimized_orders_created  ON optimized_orders(created_at DESC);

-- Index for analytics snapshots
CREATE INDEX IF NOT EXISTS idx_analytics_company_date    ON analytics_snapshots(company_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_sustainability_company    ON sustainability_metrics(company_id, metric_date DESC);
