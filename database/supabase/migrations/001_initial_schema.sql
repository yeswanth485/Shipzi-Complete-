-- =============================================
-- SHIPZI DATABASE SCHEMA
-- Migration: 001_initial_schema.sql
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- COMPANIES TABLE (must be before users)
-- =============================================
CREATE TABLE IF NOT EXISTS companies (
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
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
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

-- =============================================
-- OPTIMIZATION RUNS TABLE
-- =============================================
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

-- =============================================
-- OPTIMIZED ORDERS TABLE
-- =============================================
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

-- =============================================
-- SHIPMENTS TABLE
-- =============================================
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

-- =============================================
-- ANALYTICS SNAPSHOTS TABLE
-- =============================================
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

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  plan text NOT NULL,
  monthly_shipment_limit integer,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- STORAGE BUCKETS & POLICIES
-- =============================================

-- Ensure the company-logos bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Safely drop existing policies so this script can be re-run (handles both old and new names)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public reads for company logos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
  DROP POLICY IF EXISTS "Public users can upload logos" ON storage.objects;
  DROP POLICY IF EXISTS "Public users can update logos" ON storage.objects;
END $$;

-- Allow public read access to company logos
CREATE POLICY "Public reads for company logos" 
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'company-logos');

-- Allow public users to upload their own logos (Firebase Auth means Supabase sees anon/public)
CREATE POLICY "Public users can upload logos" 
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'company-logos');

-- Allow public users to update logos
CREATE POLICY "Public users can update logos" 
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'company-logos');


-- =============================================
-- SUSTAINABILITY METRICS TABLE
-- =============================================
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

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================
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
-- ROW LEVEL SECURITY (Disabled for Firebase Auth compatibility)
-- =============================================
-- Since the application uses Firebase for authentication instead of Supabase Auth, 
-- all requests to Supabase are seen as "anon". Therefore, RLS based on auth.uid() 
-- will block all database operations. For this architecture, we disable RLS.

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE box_catalog DISABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE optimized_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE sustainability_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- Clean up any existing restrictive policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Company members access" ON companies;
DROP POLICY IF EXISTS "Box catalog company access" ON box_catalog;
DROP POLICY IF EXISTS "Optimization runs company access" ON optimization_runs;
DROP POLICY IF EXISTS "Orders company access" ON optimized_orders;
DROP POLICY IF EXISTS "Shipments company access" ON shipments;
DROP POLICY IF EXISTS "Analytics company access" ON analytics_snapshots;
DROP POLICY IF EXISTS "Sustainability company access" ON sustainability_metrics;
DROP POLICY IF EXISTS "Subscriptions company access" ON subscriptions;

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
) ON CONFLICT (id) DO NOTHING;

INSERT INTO box_catalog (company_id, box_name, length_cm, width_cm, height_cm, max_weight_kg, material_type, cost_per_box_usd, sustainability_score)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Small Parcel', 20, 15, 10, 2, 'corrugated', 0.85, 72),
  ('00000000-0000-0000-0000-000000000001', 'Medium Box', 35, 25, 20, 8, 'corrugated', 1.40, 68),
  ('00000000-0000-0000-0000-000000000001', 'Large Box', 50, 40, 30, 20, 'corrugated', 2.20, 65),
  ('00000000-0000-0000-0000-000000000001', 'Poly Mailer S', 25, 35, 2, 1, 'poly_mailer', 0.35, 45),
  ('00000000-0000-0000-0000-000000000001', 'Rigid Gift Box', 30, 20, 10, 3, 'rigid', 3.50, 80);

-- Storage bucket for company logos
-- Run this in Supabase dashboard: Storage > New bucket "company-logos" (public)
