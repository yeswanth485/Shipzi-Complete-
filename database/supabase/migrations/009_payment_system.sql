-- ============================================================================
-- SHIPZI PAYMENT SYSTEM — Complete Database Foundation
-- Tables: users, payments, payment_events, refunds, subscriptions, credits, audit_logs
-- Safe to re-run: uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS
-- ============================================================================

-- ============================================================================
-- SAFETY: Add missing columns to existing tables
-- These run FIRST so tables created by earlier partial runs get new columns
-- ============================================================================

-- Users table — add columns if table already exists but is incomplete
ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_razorpay_customer_id_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_razorpay_customer_id_key UNIQUE (razorpay_customer_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_format') THEN
        ALTER TABLE users ADD CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
END $$;

-- Payments table — add columns if table already exists but is incomplete
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(500);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'created';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '{}';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS error_code VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS error_description TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_razorpay_order_id_key') THEN
        ALTER TABLE payments ADD CONSTRAINT payments_razorpay_order_id_key UNIQUE (razorpay_order_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_razorpay_payment_id_key') THEN
        ALTER TABLE payments ADD CONSTRAINT payments_razorpay_payment_id_key UNIQUE (razorpay_payment_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_idempotency_key_key') THEN
        ALTER TABLE payments ADD CONSTRAINT payments_idempotency_key_key UNIQUE (idempotency_key);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_status_check') THEN
        ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded'));
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_amount_positive') THEN
        ALTER TABLE payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_currency_length') THEN
        ALTER TABLE payments ADD CONSTRAINT payments_currency_length CHECK (char_length(currency) = 3);
    END IF;
END $$;

-- ============================================================================
-- SAFETY: Add missing columns to existing tables (remaining tables)
-- ============================================================================

-- Payment events table
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS event_id VARCHAR(100);
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}';
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'received';
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_events_event_id_key') THEN
        ALTER TABLE payment_events ADD CONSTRAINT payment_events_event_id_key UNIQUE (event_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_events_status_check') THEN
        ALTER TABLE payment_events ADD CONSTRAINT payment_events_status_check CHECK (status IN ('received', 'processing', 'processed', 'failed', 'dead_letter'));
    END IF;
END $$;

-- Refunds table
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE RESTRICT;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS razorpay_refund_id VARCHAR(100);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS reason VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'initiated';
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'full';
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '{}';
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refunds_razorpay_refund_id_key') THEN
        ALTER TABLE refunds ADD CONSTRAINT refunds_razorpay_refund_id_key UNIQUE (razorpay_refund_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refunds_status_check') THEN
        ALTER TABLE refunds ADD CONSTRAINT refunds_status_check CHECK (status IN ('initiated', 'pending', 'processed', 'failed'));
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refunds_type_check') THEN
        ALTER TABLE refunds ADD CONSTRAINT refunds_type_check CHECK (type IN ('full', 'partial'));
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refunds_amount_positive') THEN
        ALTER TABLE refunds ADD CONSTRAINT refunds_amount_positive CHECK (amount > 0);
    END IF;
END $$;

-- Subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(100);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'created';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_start TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_end TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_end BOOLEAN DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_razorpay_subscription_id_key') THEN
        ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_razorpay_subscription_id_key UNIQUE (razorpay_subscription_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_status_check') THEN
        ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check CHECK (status IN ('created', 'authenticated', 'active', 'paused', 'cancelled', 'completed', 'expired'));
    END IF;
END $$;

-- Credits table
ALTER TABLE credits ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE credits ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE credits ADD COLUMN IF NOT EXISTS refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL;
ALTER TABLE credits ADD COLUMN IF NOT EXISTS type VARCHAR(30) NOT NULL DEFAULT 'purchase';
ALTER TABLE credits ADD COLUMN IF NOT EXISTS amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE credits ADD COLUMN IF NOT EXISTS balance_after INTEGER NOT NULL DEFAULT 0;
ALTER TABLE credits ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE credits ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE credits ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credits_type_check') THEN
        ALTER TABLE credits ADD CONSTRAINT credits_type_check CHECK (type IN ('purchase', 'deduction', 'refund', 'admin_grant', 'admin_deduct', 'expiry'));
    END IF;
END $$;

-- Audit logs table
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor VARCHAR(100) NOT NULL DEFAULT 'system';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_data JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_data JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ============================================================================
-- TABLE 3: payment_events
-- Stores every Razorpay webhook event received. Enables idempotency.
-- event_id is Razorpay's unique event ID — deduplication key.
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL,
    processed_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT payment_events_status_check CHECK (
        status IN ('received', 'processing', 'processed', 'failed', 'dead_letter')
    )
);

CREATE INDEX IF NOT EXISTS idx_payment_events_event_id ON payment_events(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_status ON payment_events(status);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events(created_at DESC);

COMMENT ON TABLE payment_events IS 'Razorpay webhook events, event_id uniqueness prevents duplicate processing';

-- ============================================================================
-- TABLE 4: refunds
-- Tracks every refund request and its state.
-- ============================================================================
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    razorpay_refund_id VARCHAR(100) UNIQUE,
    amount INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL,
    type VARCHAR(20) NOT NULL,
    notes JSONB DEFAULT '{}',
    processed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT refunds_status_check CHECK (
        status IN ('initiated', 'pending', 'processed', 'failed')
    ),
    CONSTRAINT refunds_type_check CHECK (
        type IN ('full', 'partial')
    ),
    CONSTRAINT refunds_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_razorpay_refund_id ON refunds(razorpay_refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

COMMENT ON TABLE refunds IS 'Refund requests and processing state for Razorpay payments';

-- ============================================================================
-- TABLE 5: subscriptions
-- Future subscription architecture for monthly/annual plans per user.
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    razorpay_subscription_id VARCHAR(100) UNIQUE,
    plan_id VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    quantity INTEGER DEFAULT 1,
    current_start TIMESTAMPTZ,
    current_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_at_end BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT subscriptions_status_check CHECK (
        status IN ('created', 'authenticated', 'active', 'paused', 'cancelled', 'completed', 'expired')
    )
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_subscription_id ON subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);

COMMENT ON TABLE subscriptions IS 'Monthly/annual subscription plan bindings per user';

-- ============================================================================
-- TABLE 6: credits
-- AI credits system for Shipzi. Track purchases, deductions, and balances.
-- Balance is derived by summing credits.amount per user (never a stored field).
-- ============================================================================
CREATE TABLE IF NOT EXISTS credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT credits_type_check CHECK (
        type IN ('purchase', 'deduction', 'refund', 'admin_grant', 'admin_deduct', 'expiry')
    )
);

CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_payment_id ON credits(payment_id);
CREATE INDEX IF NOT EXISTS idx_credits_type ON credits(type);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_expires_at ON credits(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE credits IS 'AI credit transactions — balance derived by summing amount per user';

-- ============================================================================
-- TABLE 7: audit_logs
-- Immutable audit trail. NEVER update or delete rows.
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all sensitive actions — no UPDATE or DELETE allowed';

-- ============================================================================
-- TRIGGER FUNCTION: updated_at auto-update
-- Applied to all tables with updated_at column
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables that have updated_at
CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_payments
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_payment_events
    BEFORE UPDATE ON payment_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_refunds
    BEFORE UPDATE ON refunds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_subscriptions
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER: Prevent UPDATE and DELETE on audit_logs
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_audit_logs_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is immutable — UPDATE and DELETE are not allowed';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_logs_modification();

CREATE TRIGGER audit_logs_no_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_logs_modification();

-- ============================================================================
-- FUNCTION: Get user credit balance
-- Sums all credit amounts for a given user
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_credit_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_balance INTEGER;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total_balance
    FROM credits
    WHERE user_id = p_user_id
      AND (expires_at IS NULL OR expires_at > NOW());

    RETURN total_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_credit_balance IS 'Returns current credit balance for a user, excluding expired credits';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enables Supabase RLS on each table for multi-tenant security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users: users can read/update their own data; service role bypasses
CREATE POLICY users_select_own ON users
    FOR SELECT USING (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY users_update_own ON users
    FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY users_insert_service ON users
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Payments: users can read their own payments; service role has full access
CREATE POLICY payments_select_own ON payments
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY payments_insert_service ON payments
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY payments_update_service ON payments
    FOR UPDATE USING (auth.role() = 'service_role');

-- Payment events: service role only (webhook processing)
CREATE POLICY payment_events_service_only ON payment_events
    FOR ALL USING (auth.role() = 'service_role');

-- Refunds: users can read their own; service role has full access
CREATE POLICY refunds_select_own ON refunds
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY refunds_insert_service ON refunds
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY refunds_update_service ON refunds
    FOR UPDATE USING (auth.role() = 'service_role');

-- Subscriptions: users can read their own; service role has full access
CREATE POLICY subscriptions_select_own ON subscriptions
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY subscriptions_insert_service ON subscriptions
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY subscriptions_update_service ON subscriptions
    FOR UPDATE USING (auth.role() = 'service_role');

-- Credits: users can read their own; service role has full access
CREATE POLICY credits_select_own ON credits
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY credits_insert_service ON credits
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Audit logs: service role only (immutable)
CREATE POLICY audit_logs_service_only ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SEED DATA: Only run in development/testing environments
-- ============================================================================
-- NOTE: Seed data removed from production migration.
-- To seed test data, run this manually in Supabase SQL Editor:
--
-- INSERT INTO users (id, email, name, phone, is_active) VALUES
--     ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'test.user@shipzi.com', 'Test User', '+919876543210', true),
--     ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'premium.user@shipzi.com', 'Premium User', '+919876543211', true),
--     ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'admin@shipzi.com', 'Admin User', '+919876543212', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- INSERT INTO payments (id, user_id, razorpay_order_id, razorpay_payment_id, amount, currency, status, idempotency_key, description, payment_method, captured_at) VALUES
--     ('d4e5f6a7-b8c9-0123-def0-123456789013', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'order_test_001', 'pay_test_001', 99900, 'INR', 'paid', 'idem_test_001', 'Pro Monthly Subscription', 'upi', NOW() - INTERVAL '7 days'),
--     ('e5f6a7b8-c9d0-1234-ef01-234567890124', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'order_test_002', NULL, 49900, 'INR', 'created', 'idem_test_002', 'Basic Monthly Subscription', NULL, NULL)
-- ON CONFLICT (id) DO NOTHING;
