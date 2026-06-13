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
    (NEW.id, 'XS Corrugated Mailer', 15, 10, 5, 1, 'corrugated', 0.45, 75),
    (NEW.id, 'Small Corrugated Shipper', 20, 15, 10, 3, 'corrugated', 0.65, 72),
    (NEW.id, 'Medium Corrugated Box', 30, 22, 15, 7, 'corrugated', 0.95, 70),
    (NEW.id, 'Standard Shipping Box', 35, 25, 20, 10, 'corrugated', 1.20, 68),
    (NEW.id, 'Large Corrugated Box', 45, 35, 25, 15, 'corrugated', 1.80, 65),
    (NEW.id, 'XL Corrugated Container', 55, 40, 30, 20, 'corrugated', 2.40, 62),
    (NEW.id, 'Flat Corrugated Mailer', 35, 25, 5, 2, 'corrugated', 0.55, 78),
    (NEW.id, 'Book Mailer Box', 28, 20, 8, 3, 'corrugated', 0.70, 74),
    (NEW.id, 'Cubic Shipping Box', 25, 25, 25, 12, 'corrugated', 1.35, 66),
    (NEW.id, 'Long Corrugated Box', 60, 15, 10, 5, 'corrugated', 1.10, 69),
    (NEW.id, 'Heavy Duty Corrugated', 40, 30, 30, 25, 'corrugated', 2.80, 60),
    (NEW.id, 'Mini Corrugated Cube', 12, 12, 12, 2, 'corrugated', 0.40, 80),
    (NEW.id, 'Small Kraft Mailer', 18, 13, 8, 2, 'kraft', 0.55, 85),
    (NEW.id, 'Medium Kraft Box', 30, 22, 15, 6, 'kraft', 1.00, 82),
    (NEW.id, 'Large Kraft Shipper', 45, 35, 25, 12, 'kraft', 1.75, 80),
    (NEW.id, 'Kraft Pizza Box', 35, 35, 5, 2, 'kraft', 0.80, 88),
    (NEW.id, 'Kraft Gift Box', 25, 18, 10, 3, 'kraft', 1.25, 84),
    (NEW.id, 'XL Kraft Container', 50, 40, 35, 18, 'kraft', 2.50, 78),
    (NEW.id, 'Poly Mailer XS', 20, 25, 2, 0.5, 'poly_mailer', 0.15, 35),
    (NEW.id, 'Poly Mailer Small', 25, 35, 2, 1, 'poly_mailer', 0.22, 38),
    (NEW.id, 'Poly Mailer Medium', 30, 42, 2, 2, 'poly_mailer', 0.30, 40),
    (NEW.id, 'Poly Mailer Large', 38, 52, 2, 3, 'poly_mailer', 0.42, 42),
    (NEW.id, 'Bubble Poly Mailer', 30, 40, 3, 2, 'poly_mailer', 0.55, 32),
    (NEW.id, 'Poly Mailer XL', 45, 60, 2, 5, 'poly_mailer', 0.60, 36),
    (NEW.id, 'Small Rigid Gift Box', 15, 10, 8, 2, 'rigid', 2.80, 55),
    (NEW.id, 'Medium Rigid Box', 25, 18, 10, 4, 'rigid', 3.50, 52),
    (NEW.id, 'Large Rigid Gift Box', 35, 25, 15, 8, 'rigid', 5.20, 48),
    (NEW.id, 'Premium Rigid Display Box', 30, 20, 20, 6, 'rigid', 6.50, 45),
    (NEW.id, 'Rigid Jewelry Box', 12, 10, 5, 1, 'rigid', 2.20, 50),
    (NEW.id, 'XL Rigid Presentation Box', 45, 35, 20, 12, 'rigid', 8.50, 42);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_boxes ON companies;
CREATE TRIGGER trg_seed_boxes
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION seed_default_boxes();

-- =============================================
-- 13. Seed boxes for the demo company
-- =============================================
INSERT INTO box_catalog (company_id, box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score)
SELECT '00000000-0000-0000-0000-000000000001', box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score
FROM (VALUES
  ('XS Corrugated Mailer', 15, 10, 5, 1, 'corrugated', 0.45, 75),
  ('Small Corrugated Shipper', 20, 15, 10, 3, 'corrugated', 0.65, 72),
  ('Medium Corrugated Box', 30, 22, 15, 7, 'corrugated', 0.95, 70),
  ('Standard Shipping Box', 35, 25, 20, 10, 'corrugated', 1.20, 68),
  ('Large Corrugated Box', 45, 35, 25, 15, 'corrugated', 1.80, 65),
  ('XL Corrugated Container', 55, 40, 30, 20, 'corrugated', 2.40, 62),
  ('Flat Corrugated Mailer', 35, 25, 5, 2, 'corrugated', 0.55, 78),
  ('Book Mailer Box', 28, 20, 8, 3, 'corrugated', 0.70, 74),
  ('Cubic Shipping Box', 25, 25, 25, 12, 'corrugated', 1.35, 66),
  ('Long Corrugated Box', 60, 15, 10, 5, 'corrugated', 1.10, 69),
  ('Heavy Duty Corrugated', 40, 30, 30, 25, 'corrugated', 2.80, 60),
  ('Mini Corrugated Cube', 12, 12, 12, 2, 'corrugated', 0.40, 80),
  ('Small Kraft Mailer', 18, 13, 8, 2, 'kraft', 0.55, 85),
  ('Medium Kraft Box', 30, 22, 15, 6, 'kraft', 1.00, 82),
  ('Large Kraft Shipper', 45, 35, 25, 12, 'kraft', 1.75, 80),
  ('Kraft Pizza Box', 35, 35, 5, 2, 'kraft', 0.80, 88),
  ('Kraft Gift Box', 25, 18, 10, 3, 'kraft', 1.25, 84),
  ('XL Kraft Container', 50, 40, 35, 18, 'kraft', 2.50, 78),
  ('Poly Mailer XS', 20, 25, 2, 0.5, 'poly_mailer', 0.15, 35),
  ('Poly Mailer Small', 25, 35, 2, 1, 'poly_mailer', 0.22, 38),
  ('Poly Mailer Medium', 30, 42, 2, 2, 'poly_mailer', 0.30, 40),
  ('Poly Mailer Large', 38, 52, 2, 3, 'poly_mailer', 0.42, 42),
  ('Bubble Poly Mailer', 30, 40, 3, 2, 'poly_mailer', 0.55, 32),
  ('Poly Mailer XL', 45, 60, 2, 5, 'poly_mailer', 0.60, 36),
  ('Small Rigid Gift Box', 15, 10, 8, 2, 'rigid', 2.80, 55),
  ('Medium Rigid Box', 25, 18, 10, 4, 'rigid', 3.50, 52),
  ('Large Rigid Gift Box', 35, 25, 15, 8, 'rigid', 5.20, 48),
  ('Premium Rigid Display Box', 30, 20, 20, 6, 'rigid', 6.50, 45),
  ('Rigid Jewelry Box', 12, 10, 5, 1, 'rigid', 2.20, 50),
  ('XL Rigid Presentation Box', 45, 35, 20, 12, 'rigid', 8.50, 42)
) AS v(box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score)
WHERE NOT EXISTS (SELECT 1 FROM box_catalog WHERE company_id = '00000000-0000-0000-0000-000000000001');

-- =============================================
-- 14. Seed boxes for ALL existing companies that have none
-- =============================================
INSERT INTO box_catalog (company_id, box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score)
SELECT c.id, v.box_name, v.length_cm, v.width_cm, v.height_cm, v.max_weight_kg, v.material_type, v.cost_per_box_usd, v.sustainability_score
FROM companies c
CROSS JOIN (VALUES
  ('XS Corrugated Mailer', 15, 10, 5, 1, 'corrugated', 0.45, 75),
  ('Small Corrugated Shipper', 20, 15, 10, 3, 'corrugated', 0.65, 72),
  ('Medium Corrugated Box', 30, 22, 15, 7, 'corrugated', 0.95, 70),
  ('Standard Shipping Box', 35, 25, 20, 10, 'corrugated', 1.20, 68),
  ('Large Corrugated Box', 45, 35, 25, 15, 'corrugated', 1.80, 65),
  ('XL Corrugated Container', 55, 40, 30, 20, 'corrugated', 2.40, 62),
  ('Flat Corrugated Mailer', 35, 25, 5, 2, 'corrugated', 0.55, 78),
  ('Book Mailer Box', 28, 20, 8, 3, 'corrugated', 0.70, 74),
  ('Cubic Shipping Box', 25, 25, 25, 12, 'corrugated', 1.35, 66),
  ('Long Corrugated Box', 60, 15, 10, 5, 'corrugated', 1.10, 69),
  ('Heavy Duty Corrugated', 40, 30, 30, 25, 'corrugated', 2.80, 60),
  ('Mini Corrugated Cube', 12, 12, 12, 2, 'corrugated', 0.40, 80),
  ('Small Kraft Mailer', 18, 13, 8, 2, 'kraft', 0.55, 85),
  ('Medium Kraft Box', 30, 22, 15, 6, 'kraft', 1.00, 82),
  ('Large Kraft Shipper', 45, 35, 25, 12, 'kraft', 1.75, 80),
  ('Kraft Pizza Box', 35, 35, 5, 2, 'kraft', 0.80, 88),
  ('Kraft Gift Box', 25, 18, 10, 3, 'kraft', 1.25, 84),
  ('XL Kraft Container', 50, 40, 35, 18, 'kraft', 2.50, 78),
  ('Poly Mailer XS', 20, 25, 2, 0.5, 'poly_mailer', 0.15, 35),
  ('Poly Mailer Small', 25, 35, 2, 1, 'poly_mailer', 0.22, 38),
  ('Poly Mailer Medium', 30, 42, 2, 2, 'poly_mailer', 0.30, 40),
  ('Poly Mailer Large', 38, 52, 2, 3, 'poly_mailer', 0.42, 42),
  ('Bubble Poly Mailer', 30, 40, 3, 2, 'poly_mailer', 0.55, 32),
  ('Poly Mailer XL', 45, 60, 2, 5, 'poly_mailer', 0.60, 36),
  ('Small Rigid Gift Box', 15, 10, 8, 2, 'rigid', 2.80, 55),
  ('Medium Rigid Box', 25, 18, 10, 4, 'rigid', 3.50, 52),
  ('Large Rigid Gift Box', 35, 25, 15, 8, 'rigid', 5.20, 48),
  ('Premium Rigid Display Box', 30, 20, 20, 6, 'rigid', 6.50, 45),
  ('Rigid Jewelry Box', 12, 10, 5, 1, 'rigid', 2.20, 50),
  ('XL Rigid Presentation Box', 45, 35, 20, 12, 'rigid', 8.50, 42)
) AS v(box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score)
WHERE NOT EXISTS (SELECT 1 FROM box_catalog bc WHERE bc.company_id = c.id);
