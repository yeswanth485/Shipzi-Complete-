# Shipzi Payment System — Security Checklist

## PRE-DEPLOYMENT

- [ ] All env vars set in Render dashboard (never in code)
- [ ] RAZORPAY_KEY_SECRET never in frontend code or git
- [ ] .env files in .gitignore
- [ ] Webhook secret configured in Razorpay dashboard
- [ ] CORS whitelist set to production frontend URL only
- [ ] Database RLS enabled in Supabase
- [ ] Rate limits configured
- [ ] HTTPS enforced (Render provides this automatically)
- [ ] All SQL migrations run in production
- [ ] Indexes verified in production DB
- [ ] Supabase service role key stored as Secret in Render
- [ ] JWT_SECRET is a strong random string (32+ chars)

## PAYMENT SECURITY

- [ ] Amount never accepted from frontend (always calculated on backend)
- [ ] Idempotency keys enforced (no duplicate orders)
- [ ] Signature verification using crypto.timingSafeEqual (not ===)
- [ ] Webhook signature verified before processing
- [ ] Webhook event_id checked for duplicates before processing
- [ ] User ownership verified before showing payment data
- [ ] Payment belongs to authenticated user verified before refund
- [ ] Webhook always returns 200 (no error details leaked)
- [ ] Dead letter queue for failed webhooks
- [ ] Audit logs for every sensitive action

## MONITORING

- [ ] Winston logs shipping to a service (Render's built-in logs or external)
- [ ] Failed payment rate monitored
- [ ] Webhook failure rate monitored
- [ ] Dead letter events alerted
- [ ] Health check endpoint responding
- [ ] Request ID tracing in all logs
- [ ] Error rate alerting configured

## WEBHOOK SECURITY

- [ ] Webhook endpoint has NO rate limit (Razorpay must not be blocked)
- [ ] Raw body preserved for signature verification
- [ ] Event deduplication via event_id
- [ ] Retry count tracked, dead letter after 3 failures
- [ ] All events logged to audit_logs table

## RLS POLICIES

- [ ] Users can only read their own payments
- [ ] Users can only read their own refunds
- [ ] Users can only read their own credits
- [ ] Service role bypass for backend operations
- [ ] Webhook processing uses service role
- [ ] Audit logs are service-role only (immutable)
