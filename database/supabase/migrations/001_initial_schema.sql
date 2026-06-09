-- =============================================
-- SHIPZI DATABASE SCHEMA
-- Migration: 001_initial_schema.sql
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- COMPANIES TABLE (must be before users)
-- =============================================
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  industry text,
  warehouse_size text,
  monthly_shipment_volume integer,
  packaging_goals text[],
  sustainability_goals text[],
  shipping_regions text[],
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  company_id uuid REFERENCES companies(id),
  onboarding_complete boolean DEFAULT false,
  role text DEFAULT 'member',
  notification_preferences jsonb DEFAULT '{}',
  api_key text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- BOX CATALOG TABLE
-- =============================================
CREATE TABLE box_catalog (
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

-- =============================================
-- OPTIMIZATION RUNS TABLE
-- =============================================
CREATE TABLE optimization_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  user_id uuid REFERENCES users(id),
  run_name text,
  total_products integer,
  total_savings_usd numeric,
  avg_utilization_pct numeric,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- OPTIMIZED ORDERS TABLE
-- =============================================
CREATE TABLE optimized_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES optimization_runs(id),
  company_id uuid REFERENCES companies(id),
  product_name text NOT NULL,
  product_length_cm numeric,
  product_width_cm numeric,
  product_height_cm numeric,
  product_weight_kg numeric,
  fragility text CHECK (fragility IN ('low', 'medium', 'high')),
  quantity integer,
  shipping_zone text,
  recommended_box_id uuid REFERENCES box_catalog(id),
  current_box_id uuid REFERENCES box_catalog(id),
  savings_usd numeric,
  shipping_cost_usd numeric,
  utilization_pct numeric,
  dimensional_weight_kg numeric,
  sustainability_impact text,
  sustainability_score integer,
  ai_explanation text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- SHIPMENTS TABLE
-- =============================================
CREATE TABLE shipments (
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

-- =============================================
-- ANALYTICS SNAPSHOTS TABLE
-- =============================================
CREATE TABLE analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  snapshot_date date NOT NULL,
  total_shipments integer DEFAULT 0,
  optimized_shipments integer DEFAULT 0,
  total_savings_usd numeric DEFAULT 0,
  avg_utilization_pct numeric DEFAULT 0,
  optimization_rate_pct numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- SUSTAINABILITY METRICS TABLE
-- =============================================
CREATE TABLE sustainability_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  metric_date date NOT NULL,
  carbon_reduction_kg numeric DEFAULT 0,
  packaging_waste_reduction_pct numeric DEFAULT 0,
  recyclable_material_pct numeric DEFAULT 0,
  sustainability_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE subscriptions (
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
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimized_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sustainability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users: can only see own row
CREATE POLICY "Users can read own data" ON users
  FOR ALL USING (id = auth.uid());

-- Companies: members can access own company
CREATE POLICY "Company members access" ON companies
  FOR ALL USING (
    id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Box catalog RLS
CREATE POLICY "Box catalog company access" ON box_catalog
  FOR ALL USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Optimization runs RLS
CREATE POLICY "Optimization runs company access" ON optimization_runs
  FOR ALL USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Optimized orders RLS
CREATE POLICY "Orders company access" ON optimized_orders
  FOR ALL USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Shipments RLS
CREATE POLICY "Shipments company access" ON shipments
  FOR ALL USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Analytics snapshots RLS
CREATE POLICY "Analytics company access" ON analytics_snapshots
  FOR ALL USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Sustainability metrics RLS
CREATE POLICY "Sustainability company access" ON sustainability_metrics
  FOR ALL USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Subscriptions RLS
CREATE POLICY "Subscriptions company access" ON subscriptions
  FOR ALL USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- DEMO COMPANY + SEED DATA
-- =============================================
INSERT INTO companies (id, name, industry, warehouse_size, monthly_shipment_volume)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Company',
  'E-Commerce',
  'Medium (5K-20K)',
  5000
);

INSERT INTO box_catalog (company_id, box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Small Parcel', 20, 15, 10, 2, 'corrugated', 0.85, 72),
  ('00000000-0000-0000-0000-000000000001', 'Medium Box', 35, 25, 20, 8, 'corrugated', 1.40, 68),
  ('00000000-0000-0000-0000-000000000001', 'Large Box', 50, 40, 30, 20, 'corrugated', 2.20, 65),
  ('00000000-0000-0000-0000-000000000001', 'Poly Mailer S', 25, 35, 2, 1, 'poly_mailer', 0.35, 45),
  ('00000000-0000-0000-0000-000000000001', 'Rigid Gift Box', 30, 20, 10, 3, 'rigid', 3.50, 80);

-- Storage bucket for company logos
-- Run this in Supabase dashboard: Storage > New bucket "company-logos" (public)
