-- =============================================
-- MIGRATION 006b: Fix RLS policies & storage
-- Idempotent — safe to run multiple times
-- =============================================

-- ── Enable RLS on all tables ──
DO $$ BEGIN
  ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimized_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sustainability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── Companies ──
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_companies" ON companies; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to companies" ON companies; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_insert_companies" ON companies; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_select_companies" ON companies; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_update_companies" ON companies; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "anon_all_companies" ON companies FOR ALL USING (true) WITH CHECK (true);

-- ── Users ──
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_users" ON users; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to users" ON users; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_insert_users" ON users; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_select_users" ON users; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_update_users" ON users; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "anon_all_users" ON users FOR ALL USING (true) WITH CHECK (true);

-- ── Box Catalog ──
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_box_catalog" ON box_catalog; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to box_catalog" ON box_catalog; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "anon_all_box_catalog" ON box_catalog FOR ALL USING (true) WITH CHECK (true);

-- ── Optimization Runs ──
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_optimization_runs" ON optimization_runs; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to optimization_runs" ON optimization_runs; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "anon_all_optimization_runs" ON optimization_runs FOR ALL USING (true) WITH CHECK (true);

-- ── Optimized Orders ──
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_optimized_orders" ON optimized_orders; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to optimized_orders" ON optimized_orders; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "anon_all_optimized_orders" ON optimized_orders FOR ALL USING (true) WITH CHECK (true);

-- ── Shipments ──
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_shipments" ON shipments; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to shipments" ON shipments; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "anon_all_shipments" ON shipments FOR ALL USING (true) WITH CHECK (true);

-- ── Analytics Snapshots ──
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_analytics_snapshots" ON analytics_snapshots; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to analytics_snapshots" ON analytics_snapshots; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "anon_all_analytics_snapshots" ON analytics_snapshots FOR ALL USING (true) WITH CHECK (true);

-- ── Sustainability Metrics ──
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_sustainability_metrics" ON sustainability_metrics; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to sustainability_metrics" ON sustainability_metrics; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "anon_all_sustainability_metrics" ON sustainability_metrics FOR ALL USING (true) WITH CHECK (true);

-- ── Subscriptions ──
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_subscriptions" ON subscriptions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to subscriptions" ON subscriptions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "anon_all_subscriptions" ON subscriptions FOR ALL USING (true) WITH CHECK (true);

-- ── Fix Storage: Allow public uploads to company-logos ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN DROP POLICY IF EXISTS "Public reads for company logos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Authenticated users to update logos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Public users can upload logos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Public users to update logos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Public full access to company logos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Public full access to company logos" ON storage.objects
  FOR ALL TO public
  USING (bucket_id = 'company-logos')
  WITH CHECK (bucket_id = 'company-logos');
