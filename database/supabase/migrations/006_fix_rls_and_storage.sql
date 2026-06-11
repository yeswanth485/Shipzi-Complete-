-- =============================================
-- MIGRATION 006: Fix RLS policies & storage
-- Ensures all tables are insertable via anon key
-- and company-logos bucket allows public uploads
-- =============================================

-- ── Enable RLS on all tables (security best practice) ──
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimized_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sustainability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ── Drop existing policies to avoid conflicts ──
DO $$ BEGIN
  -- companies
  DROP POLICY IF EXISTS "Allow all access to companies" ON companies;
  DROP POLICY IF EXISTS "anon_insert_companies" ON companies;
  DROP POLICY IF EXISTS "anon_select_companies" ON companies;
  DROP POLICY IF EXISTS "anon_update_companies" ON companies;
  -- users
  DROP POLICY IF EXISTS "Allow all access to users" ON users;
  DROP POLICY IF EXISTS "anon_insert_users" ON users;
  DROP POLICY IF EXISTS "anon_select_users" ON users;
  DROP POLICY IF EXISTS "anon_update_users" ON users;
  -- box_catalog
  DROP POLICY IF EXISTS "Allow all access to box_catalog" ON box_catalog;
  DROP POLICY IF EXISTS "anon_all_box_catalog" ON box_catalog;
  -- optimization_runs
  DROP POLICY IF EXISTS "Allow all access to optimization_runs" ON optimization_runs;
  DROP POLICY IF EXISTS "anon_all_optimization_runs" ON optimization_runs;
  -- optimized_orders
  DROP POLICY IF EXISTS "Allow all access to optimized_orders" ON optimized_orders;
  DROP POLICY IF EXISTS "anon_all_optimized_orders" ON optimized_orders;
  -- shipments
  DROP POLICY IF EXISTS "Allow all access to shipments" ON shipments;
  DROP POLICY IF EXISTS "anon_all_shipments" ON shipments;
  -- analytics_snapshots
  DROP POLICY IF EXISTS "Allow all access to analytics_snapshots" ON analytics_snapshots;
  DROP POLICY IF EXISTS "anon_all_analytics_snapshots" ON analytics_snapshots;
  -- sustainability_metrics
  DROP POLICY IF EXISTS "Allow all access to sustainability_metrics" ON sustainability_metrics;
  DROP POLICY IF EXISTS "anon_all_sustainability_metrics" ON sustainability_metrics;
  -- subscriptions
  DROP POLICY IF EXISTS "Allow all access to subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "anon_all_subscriptions" ON subscriptions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── Create permissive policies for anon + authenticated roles ──

-- Companies
CREATE POLICY "anon_all_companies" ON companies FOR ALL
  USING (true) WITH CHECK (true);

-- Users
CREATE POLICY "anon_all_users" ON users FOR ALL
  USING (true) WITH CHECK (true);

-- Box Catalog
CREATE POLICY "anon_all_box_catalog" ON box_catalog FOR ALL
  USING (true) WITH CHECK (true);

-- Optimization Runs
CREATE POLICY "anon_all_optimization_runs" ON optimization_runs FOR ALL
  USING (true) WITH CHECK (true);

-- Optimized Orders
CREATE POLICY "anon_all_optimized_orders" ON optimized_orders FOR ALL
  USING (true) WITH CHECK (true);

-- Shipments
CREATE POLICY "anon_all_shipments" ON shipments FOR ALL
  USING (true) WITH CHECK (true);

-- Analytics Snapshots
CREATE POLICY "anon_all_analytics_snapshots" ON analytics_snapshots FOR ALL
  USING (true) WITH CHECK (true);

-- Sustainability Metrics
CREATE POLICY "anon_all_sustainability_metrics" ON sustainability_metrics FOR ALL
  USING (true) WITH CHECK (true);

-- Subscriptions
CREATE POLICY "anon_all_subscriptions" ON subscriptions FOR ALL
  USING (true) WITH CHECK (true);

-- ── Fix Storage: Allow public uploads to company-logos ──

-- Recreate bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old storage policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public reads for company logos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
  DROP POLICY IF EXISTS "Public users can upload logos" ON storage.objects;
  DROP POLICY IF EXISTS "Public users can update logos" ON storage.objects;
  DROP POLICY IF EXISTS "Public full access to company logos" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Allow EVERYONE to read, upload, update company logos
CREATE POLICY "Public full access to company logos" ON storage.objects
  FOR ALL TO public
  USING (bucket_id = 'company-logos')
  WITH CHECK (bucket_id = 'company-logos');
