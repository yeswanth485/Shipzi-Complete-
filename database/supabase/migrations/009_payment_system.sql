-- ============================================================================
-- SHIPZI PAYMENT SYSTEM — Complete Database Foundation
-- Tables: users, payments, payment_events, refunds, subscriptions, credits, audit_logs
-- Safe to re-run: uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS
-- ============================================================================

-- ============================================================================
-- PHASE 1: CREATE TABLES (skip if already exist)
-- Order matters: users first (others reference it), then payments, then rest
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

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
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
    CONSTRAINT payments_status_check CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
    CONSTRAINT payments_amount_positive CHECK (amount > 0),
    CONSTRAINT payments_currency_length CHECK (char_length(currency) = 3)
);

CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL,
    processed_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT payment_events_status_check CHECK (status IN ('received', 'processing', 'processed', 'failed', 'dead_letter'))
);

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    user_id UUID NOT NULL,
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
    CONSTRAINT refunds_status_check CHECK (status IN ('initiated', 'pending', 'processed', 'failed')),
    CONSTRAINT refunds_type_check CHECK (type IN ('full', 'partial')),
    CONSTRAINT refunds_amount_positive CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
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
    CONSTRAINT subscriptions_status_check CHECK (status IN ('created', 'authenticated', 'active', 'paused', 'cancelled', 'completed', 'expired'))
);

CREATE TABLE IF NOT EXISTS credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    payment_id UUID,
    refund_id UUID,
    type VARCHAR(30) NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT credits_type_check CHECK (type IN ('purchase', 'deduction', 'refund', 'admin_grant', 'admin_deduct', 'expiry'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
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

-- ============================================================================
-- PHASE 2: ADD MISSING COLUMNS (for tables created by earlier partial runs)
-- These use ADD COLUMN IF NOT EXISTS — safe if columns already exist
-- ============================================================================

-- Users
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

-- Payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id UUID;
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

-- Payment events
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS payment_id UUID;
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

-- Refunds
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS payment_id UUID;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS user_id UUID;
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

-- Subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
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

-- Credits
ALTER TABLE credits ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE credits ADD COLUMN IF NOT EXISTS payment_id UUID;
ALTER TABLE credits ADD COLUMN IF NOT EXISTS refund_id UUID;
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

-- Audit logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id UUID;
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
-- PHASE 3: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_razorpay_customer_id ON users(razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_events_event_id ON payment_events(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_status ON payment_events(status);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_razorpay_refund_id ON refunds(razorpay_refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_subscription_id ON subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_payment_id ON credits(payment_id);
CREATE INDEX IF NOT EXISTS idx_credits_type ON credits(type);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_expires_at ON credits(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- PHASE 4: TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_users ON users;
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_payments ON payments;
CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_payment_events ON payment_events;
CREATE TRIGGER set_updated_at_payment_events BEFORE UPDATE ON payment_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_refunds ON refunds;
CREATE TRIGGER set_updated_at_refunds BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_subscriptions ON subscriptions;
CREATE TRIGGER set_updated_at_subscriptions BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logs: prevent UPDATE and DELETE
CREATE OR REPLACE FUNCTION prevent_audit_logs_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is immutable — UPDATE and DELETE are not allowed';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_logs_modification();

DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_logs_modification();

-- ============================================================================
-- PHASE 5: FUNCTIONS
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

-- ============================================================================
-- PHASE 6: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users FOR SELECT USING (auth.uid() = id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS users_insert_service ON users;
CREATE POLICY users_insert_service ON users FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS payments_select_own ON payments;
CREATE POLICY payments_select_own ON payments FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS payments_insert_service ON payments;
CREATE POLICY payments_insert_service ON payments FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS payments_update_service ON payments;
CREATE POLICY payments_update_service ON payments FOR UPDATE USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS payment_events_service_only ON payment_events;
CREATE POLICY payment_events_service_only ON payment_events FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS refunds_select_own ON refunds;
CREATE POLICY refunds_select_own ON refunds FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS refunds_insert_service ON refunds;
CREATE POLICY refunds_insert_service ON refunds FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS refunds_update_service ON refunds;
CREATE POLICY refunds_update_service ON refunds FOR UPDATE USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS subscriptions_select_own ON subscriptions;
CREATE POLICY subscriptions_select_own ON subscriptions FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS subscriptions_insert_service ON subscriptions;
CREATE POLICY subscriptions_insert_service ON subscriptions FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS subscriptions_update_service ON subscriptions;
CREATE POLICY subscriptions_update_service ON subscriptions FOR UPDATE USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS credits_select_own ON credits;
CREATE POLICY credits_select_own ON credits FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS credits_insert_service ON credits;
CREATE POLICY credits_insert_service ON credits FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS audit_logs_service_only ON audit_logs;
CREATE POLICY audit_logs_service_only ON audit_logs FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================
COMMENT ON TABLE users IS 'Registered users of Shipzi platform with optional Razorpay customer binding';
COMMENT ON TABLE payments IS 'Every Razorpay payment attempt and result, amount in paise';
COMMENT ON TABLE payment_events IS 'Razorpay webhook events, event_id uniqueness prevents duplicate processing';
COMMENT ON TABLE refunds IS 'Refund requests and processing state for Razorpay payments';
COMMENT ON TABLE subscriptions IS 'Monthly/annual subscription plan bindings per user';
COMMENT ON TABLE credits IS 'AI credit transactions — balance derived by summing amount per user';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all sensitive actions — no UPDATE or DELETE allowed';
COMMENT ON FUNCTION get_user_credit_balance IS 'Returns current credit balance for a user, excluding expired credits';
