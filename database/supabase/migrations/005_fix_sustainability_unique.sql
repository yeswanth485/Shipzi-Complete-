-- =============================================
-- MIGRATION 005: Fix sustainability_metrics unique constraint
-- The backend does upsert with onConflict: 'company_id,metric_date'
-- which requires a UNIQUE constraint on those columns.
-- =============================================

-- Add UNIQUE constraint for sustainability_metrics upsert (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'sustainability_metrics'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'sustainability_metrics_company_date_unique'
  ) THEN
    -- Drop non-unique index if it exists (would conflict with adding UNIQUE)
    DROP INDEX IF EXISTS idx_sustainability_company;
    
    ALTER TABLE sustainability_metrics 
      ADD CONSTRAINT sustainability_metrics_company_date_unique 
      UNIQUE (company_id, metric_date);
    
    RAISE NOTICE 'Added UNIQUE constraint on sustainability_metrics(company_id, metric_date)';
  ELSE
    RAISE NOTICE 'UNIQUE constraint already exists — skipping';
  END IF;
END $$;

-- Recreate the performance index (partial, for reads)
CREATE INDEX IF NOT EXISTS idx_sustainability_company_date 
  ON sustainability_metrics(company_id, metric_date DESC);
