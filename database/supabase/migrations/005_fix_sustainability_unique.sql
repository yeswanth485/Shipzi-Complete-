-- =============================================
-- MIGRATION 005: Fix sustainability_metrics unique constraint
-- The backend does upsert with onConflict: 'company_id,metric_date'
-- which requires a UNIQUE constraint on those columns.
-- =============================================

-- Add UNIQUE constraint for sustainability_metrics upsert
DO $$
BEGIN
  -- Drop existing index if it exists (might conflict with adding UNIQUE)
  DROP INDEX IF EXISTS idx_sustainability_company;
  
  -- Add UNIQUE constraint
  ALTER TABLE sustainability_metrics 
    ADD CONSTRAINT sustainability_metrics_company_date_unique 
    UNIQUE (company_id, metric_date);
END $$;

-- Recreate the performance index (partial, for reads)
CREATE INDEX IF NOT EXISTS idx_sustainability_company_date 
  ON sustainability_metrics(company_id, metric_date DESC);
