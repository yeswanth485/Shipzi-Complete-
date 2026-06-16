# Render Environment Variables Setup

## Step-by-Step Guide

### 1. Go to Render Dashboard
- Navigate to your Shipzi Payments service
- Click **Environment** tab

### 2. Add Environment Variables

| Variable | Value | Secret? |
|----------|-------|---------|
| `NODE_ENV` | `production` | No |
| `PORT` | `5000` | No |
| `SUPABASE_URL` | Your Supabase project URL | No |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API → service_role key | **Yes** |
| `SUPABASE_ANON_KEY` | From Supabase → Settings → API → anon public key | No |
| `RAZORPAY_KEY_ID` | Your Razorpay Key ID (rzp_live_xxxx or rzp_test_xxxx) | No |
| `RAZORPAY_KEY_SECRET` | From Razorpay → Settings → API Keys → Key Secret | **Yes** |
| `RAZORPAY_WEBHOOK_SECRET` | From Razorpay → Settings → Webhooks → Webhook Secret | **Yes** |
| `JWT_SECRET` | Strong random string (generate with: openssl rand -base64 32) | **Yes** |
| `FRONTEND_URL` | Your production Next.js URL (e.g., https://shipzi.vercel.app) | No |
| `ALLOWED_ORIGINS` | Same as FRONTEND_URL (comma-separated if multiple) | No |
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 minutes) | No |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | No |

### 3. Mark Sensitive Variables as Secret
Click the eye icon next to these variables to mark them as Secret:
- SUPABASE_SERVICE_ROLE_KEY
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET
- JWT_SECRET

### 4. Razorpay Webhook Configuration
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add Webhook URL: `https://your-app.onrender.com/api/payment/webhook`
3. Select Events:
   - `payment.captured`
   - `payment.failed`
   - `payment.authorized`
   - `refund.processed`
   - `refund.created`
4. Copy the Webhook Secret and set it as `RAZORPAY_WEBHOOK_SECRET`

### 5. Supabase Setup
1. Go to Supabase → Project Settings → API
2. Copy `URL` → set as `SUPABASE_URL`
3. Copy `service_role` key → set as `SUPABASE_SERVICE_ROLE_KEY` (mark as Secret)
4. Copy `anon` key → set as `SUPABASE_ANON_KEY`
5. Go to SQL Editor → paste contents of `009_payment_system.sql` → Run

### 6. Generate JWT Secret
Run locally:
```bash
openssl rand -base64 32
```
Use the output as `JWT_SECRET`.

### 7. Test Endpoints
After deployment, verify:
- `GET /health` → `{"status":"healthy"}`
- `POST /api/payment/create-order` → requires auth token
- `POST /api/payment/webhook` → requires valid Razorpay signature
