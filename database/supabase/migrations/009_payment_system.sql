-- ============================================================================
-- SHIPZI PAYMENT SYSTEM — Complete Database Foundation
-- Tables: users, payments, payment_events, refunds, subscriptions, credits, audit_logs
-- ============================================================================

-- ============================================================================
-- TABLE 1: users
-- Stores all registered users of Shipzi
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    razorpay_customer_id VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_razorpay_customer_id ON users(razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE users IS 'Registered users of Shipzi platform with optional Razorpay customer binding';

-- ============================================================================
-- TABLE 2: payments
-- Core payments table. Every Razorpay payment attempt is stored here.
-- Amount is ALWAYS in paise (INR minor units), NEVER in rupees.
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    razorpay_order_id VARCHAR(100) UNIQUE NOT NULL,
    razorpay_payment_id VARCHAR(100) UNIQUE,
    razorpay_signature VARCHAR(500),
    amount INTEGER NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    status VARCHAR(30) NOT NULL,
    description TEXT,
    notes JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    payment_method VARCHAR(50),
    error_code VARCHAR(100),
    error_description TEXT,
    captured_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT payments_status_check CHECK (
        status IN ('created', 'attempted', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded')
    ),
    CONSTRAINT payments_amount_positive CHECK (amount > 0),
    CONSTRAINT payments_currency_length CHECK (char_length(currency) = 3)
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

COMMENT ON TABLE payments IS 'Every Razorpay payment attempt and result, amount in paise';

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
