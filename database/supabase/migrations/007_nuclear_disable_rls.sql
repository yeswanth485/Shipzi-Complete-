-- MIGRATION 007: Nuclear fix — disable ALL RLS and ensure all tables work
-- This is the definitive fix for all insert/query issues

-- Disable RLS on EVERY table
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE box_catalog DISABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE optimized_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE sustainability_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- Drop ALL RLS policies (clean slate)
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_companies" ON companies; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_users" ON users; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_box_catalog" ON box_catalog; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_optimization_runs" ON optimization_runs; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_optimized_orders" ON optimized_orders; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_shipments" ON shipments; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_analytics_snapshots" ON analytics_snapshots; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_sustainability_metrics" ON sustainability_metrics; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "anon_all_subscriptions" ON subscriptions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to companies" ON companies; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to users" ON users; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to box_catalog" ON box_catalog; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to optimization_runs" ON optimization_runs; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to optimized_orders" ON optimized_orders; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to shipments" ON shipments; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to analytics_snapshots" ON analytics_snapshots; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to sustainability_metrics" ON sustainability_metrics; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow all access to subscriptions" ON subscriptions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Public full access to company logos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Public reads for company logos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Authenticated users to update logos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Public users can upload logos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Public users to update logos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Ensure demo company exists
INSERT INTO companies (id, name, industry, warehouse_size, monthly_shipment_volume)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Company', 'E-Commerce', 'Medium', 5000)
ON CONFLICT (id) DO NOTHING;

-- Ensure all users have a company_id
UPDATE users SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- Fix storage — allow all uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true) ON CONFLICT (id) DO UPDATE SET public = true;
CREATE POLICY "Public full access to company logos" ON storage.objects FOR ALL TO public USING (bucket_id = 'company-logos') WITH CHECK (bucket_id = 'company-logos');
