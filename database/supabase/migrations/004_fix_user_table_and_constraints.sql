-- 004_fix_user_table_and_constraints.sql
-- Complete fix: rename table, ensure demo company, assign all users, add constraints

-- =============================================
-- 1. RENAME TABLE (if singular "user" exists)
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public')
  THEN
    ALTER TABLE "user" RENAME TO users;
  END IF;
END $$;

-- =============================================
-- 2. ENSURE users TABLE EXISTS (fallback if neither exists)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  company_id uuid,
  onboarding_complete boolean DEFAULT false,
  role text DEFAULT 'member',
  notification_preferences jsonb DEFAULT '{}',
  api_key text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 3. ENSURE company_id COLUMN EXISTS
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE users ADD COLUMN company_id uuid;
  END IF;
END $$;

-- =============================================
-- 4. ENSURE DEMO COMPANY EXISTS
-- =============================================
INSERT INTO companies (id, name, industry, warehouse_size, monthly_shipment_volume)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Company',
  'E-Commerce',
  'Medium (5K-20K)',
  5000
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 5. ASSIGN ALL USERS WITHOUT company_id TO DEMO COMPANY
-- =============================================
UPDATE users
SET company_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- =============================================
-- 6. ADD FOREIGN KEY CONSTRAINT (safe to rerun)
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'fk_users_company'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_company
      FOREIGN KEY (company_id)
      REFERENCES companies(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================
-- 7. ADD INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================
-- 8. ENSURE ALL OTHER TABLES EXIST (from 001 schema)
-- =============================================
CREATE TABLE IF NOT EXISTS box_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  box_name text NOT NULL,
  length_cm numeric NOT NULL,
  width_cm numeric NOT NULL,
  height_cm numeric NOT NULL,
  max_weight_kg numeric NOT NULL,
  material_type text CHECK (material_type IN ('corrugated', 'kraft', 'rigid', 'poly_mailer')),
  cost_per_box_usd numeric NOT NULL,
  sustainability_score integer CHECK (sustainability_score BETWEEN 1 AND 100),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS optimization_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  user_id text REFERENCES users(id),
  run_name text,
  total_products integer,
  total_savings_usd numeric,
  avg_utilization_pct numeric,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS optimized_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES optimization_runs(id),
  company_id uuid REFERENCES companies(id),
  product_name text NOT NULL,
  product_length_cm numeric,
  product_width_cm numeric,
  product_height_cm numeric,
  product_weight_kg numeric,
  fragility text CHECK (fragility IN ('low', 'medium', 'high')),
  fragility_score integer,
  quantity integer,
  shipping_zone text,
  used_box_length_cm numeric,
  used_box_width_cm numeric,
  used_box_height_cm numeric,
  used_box_price_usd numeric,
  recommended_box_id uuid REFERENCES box_catalog(id),
  current_box_id uuid REFERENCES box_catalog(id),
  original_box_price_usd numeric,
  optimized_box_price_usd numeric,
  savings_usd numeric,
  shipping_cost_usd numeric,
  utilization_pct numeric,
  dimensional_weight_kg numeric,
  sustainability_impact text,
  sustainability_score integer,
  fit_status text,
  optimization_reason text,
  ai_explanation text,
  run_row_index integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES optimized_orders(id),
  company_id uuid REFERENCES companies(id),
  tracking_number text,
  carrier text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'optimized', 'packed', 'shipped', 'delivered')),
  estimated_delivery_date date,
  actual_delivery_date date,
  package_weight_kg numeric,
  packaging_details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  snapshot_date date NOT NULL,
  total_shipments integer DEFAULT 0,
  optimized_shipments integer DEFAULT 0,
  total_savings_usd numeric DEFAULT 0,
  avg_utilization_pct numeric DEFAULT 0,
  optimization_rate_pct numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS sustainability_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  metric_date date NOT NULL,
  carbon_reduction_kg numeric DEFAULT 0,
  packaging_waste_reduction_pct numeric DEFAULT 0,
  recyclable_material_pct numeric DEFAULT 0,
  sustainability_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'growth', 'enterprise')),
  status text DEFAULT 'active',
  monthly_shipment_limit integer,
  current_usage integer DEFAULT 0,
  billing_cycle_start date,
  billing_cycle_end date,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 9. DISABLE ROW LEVEL SECURITY (Firebase Auth)
-- =============================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE box_catalog DISABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE optimized_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE sustainability_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 10. SEED BOX CATALOG FOR DEMO COMPANY (if empty)
-- =============================================
INSERT INTO box_catalog (company_id, box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score)
SELECT '00000000-0000-0000-0000-000000000001', box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score
FROM (VALUES
  ('Small Parcel', 20, 15, 10, 2, 'corrugated', 0.85, 72),
  ('Medium Box', 35, 25, 20, 8, 'corrugated', 1.40, 68),
  ('Large Box', 50, 40, 30, 20, 'corrugated', 2.20, 65),
  ('Poly Mailer S', 25, 35, 2, 1, 'poly_mailer', 0.35, 45),
  ('Rigid Gift Box', 30, 20, 10, 3, 'rigid', 3.50, 80)
) AS v(box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score)
WHERE NOT EXISTS (SELECT 1 FROM box_catalog WHERE company_id = '00000000-0000-0000-0000-000000000001');

-- =============================================
-- 11. STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 12. TRIGGER: Auto-seed box catalog for new companies
-- =============================================
CREATE OR REPLACE FUNCTION seed_default_boxes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO box_catalog (company_id, box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score)
  VALUES
    (NEW.id, 'Small Parcel', 20, 15, 10, 2, 'corrugated', 0.85, 72),
    (NEW.id, 'Medium Box', 35, 25, 20, 8, 'corrugated', 1.40, 68),
    (NEW.id, 'Large Box', 50, 40, 30, 20, 'corrugated', 2.20, 65),
    (NEW.id, 'Poly Mailer S', 25, 35, 2, 1, 'poly_mailer', 0.35, 45),
    (NEW.id, 'Rigid Gift Box', 30, 20, 10, 3, 'rigid', 3.50, 80);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_boxes ON companies;
CREATE TRIGGER trg_seed_boxes
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION seed_default_boxes();

-- =============================================
-- 13. Also seed boxes for the demo company
-- =============================================
INSERT INTO box_catalog (company_id, box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score)
SELECT '00000000-0000-0000-0000-000000000001', box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score
FROM (VALUES
  ('Small Parcel', 20, 15, 10, 2, 'corrugated', 0.85, 72),
  ('Medium Box', 35, 25, 20, 8, 'corrugated', 1.40, 68),
  ('Large Box', 50, 40, 30, 20, 'corrugated', 2.20, 65),
  ('Poly Mailer S', 25, 35, 2, 1, 'poly_mailer', 0.35, 45),
  ('Rigid Gift Box', 30, 20, 10, 3, 'rigid', 3.50, 80)
) AS v(box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score)
WHERE NOT EXISTS (SELECT 1 FROM box_catalog WHERE company_id = '00000000-0000-0000-0000-000000000001');

-- =============================================
-- 14. Seed boxes for ALL existing companies that have none
-- =============================================
INSERT INTO box_catalog (company_id, box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score)
SELECT c.id, v.box_name, v.length_cm, v.width_cm, v.height_cm, v.max_weight_kg, v.material_type, v.cost_per_box_usd, v.sustainability_score
FROM companies c
CROSS JOIN (VALUES
  ('Small Parcel', 20, 15, 10, 2, 'corrugated', 0.85, 72),
  ('Medium Box', 35, 25, 20, 8, 'corrugated', 1.40, 68),
  ('Large Box', 50, 40, 30, 20, 'corrugated', 2.20, 65),
  ('Poly Mailer S', 25, 35, 2, 1, 'poly_mailer', 0.35, 45),
  ('Rigid Gift Box', 30, 20, 10, 3, 'rigid', 3.50, 80)
) AS v(box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score)
WHERE NOT EXISTS (SELECT 1 FROM box_catalog bc WHERE bc.company_id = c.id);
