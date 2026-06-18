# Shipzi Security Audit — PRD Document

**Date:** 2026-06-18
**Scope:** Full codebase — Backend (Node.js/Express), Frontend (Next.js 14), ML Bridge (Python/Flask), Deployment Configs
**Methodology:** Each finding is produced by following a specific skill's workflow from the Anthropic-Cybersecurity-Skills library, applied to the actual source code.

---

## Table of Contents

1. [Skills Used & How Each Was Applied](#1-skills-used--how-each-was-applied)
2. [CRITICAL Findings (6)](#2-critical-findings)
3. [HIGH Findings (6)](#3-high-findings)
4. [MEDIUM Findings (7)](#4-medium-findings)
5. [LOW Findings (5)](#5-low-findings)
6. [Dependency Vulnerabilities](#6-dependency-vulnerabilities)
7. [Impact Analysis](#7-impact-analysis)
8. [Remediation Roadmap](#8-remediation-roadmap)

---

## 1. Skills Used & How Each Was Applied

### Skill 1: `testing-for-broken-access-control`
**File:** `skills/testing-for-broken-access-control/SKILL.md`
**MITRE ATT&CK:** T1190, T1068
**NIST CSF:** PR.PS-01, DE.CM-01

**Workflow applied:**
- Step 1: Map all endpoints and create access control matrix
- Step 2: Test each endpoint with and without authentication
- Step 3: Test IDOR by substituting resource IDs
- Step 4: Test privilege escalation across roles

**How it works:** This skill teaches how to systematically test every API endpoint for missing authorization checks. It follows OWASP A01:2021 methodology — map endpoints, test with different auth contexts, check if resource ownership is verified.

**Result:** Found the `/api/optimize` backend endpoint and `/api/optimize/bulk` frontend endpoint have zero authentication.

---

### Skill 2: `testing-cors-misconfiguration`
**File:** `skills/testing-cors-misconfiguration/SKILL.md`
**MITRE ATT&CK:** T1190, T1003
**NIST CSF:** PR.PS-01, DE.CM-01

**Workflow applied:**
- Step 1: Check CORS configuration on all API endpoints
- Step 2: Test with foreign Origin header (`curl -H "Origin: https://evil.com"`)
- Step 3: Check if `Access-Control-Allow-Credentials: true` is set with wildcard origin

**How it works:** The skill checks whether the server reflects arbitrary `Origin` headers in `Access-Control-Allow-Origin`, and whether `Access-Control-Allow-Credentials: true` is set. This combination allows any website to make authenticated cross-origin requests.

**Result:** Backend uses `origin: true` which reflects any origin with credentials. ML bridge uses `CORS(app)` which defaults to `*`.

---

### Skill 3: `implementing-secrets-management-with-vault`
**File:** `skills/implementing-secrets-management-with-vault/SKILL.md`
**MITRE ATT&CK:** T1552.001, T1078.004
**NIST CSF:** PR.IR-01, ID.AM-08

**Workflow applied:**
- Step 1: Scan all env files for hardcoded credentials
- Step 2: Check if secrets are in source code or committed to git
- Step 3: Verify secrets are not logged to console/files
- Step 4: Check for secrets in client-side bundles

**How it works:** This skill identifies hardcoded credentials, checks if they're in version control, verifies logging doesn't leak them, and ensures client-side code doesn't expose server-side secrets.

**Result:** Found Razorpay test key in `.env` (committed to git), API key logged to console, OpenRouter key with `NEXT_PUBLIC_` prefix (exposed in client bundle).

---

### Skill 4: `performing-security-headers-audit`
**File:** `skills/performing-security-headers-audit/SKILL.md`
**MITRE ATT&CK:** T1190
**NIST CSF:** PR.PS-01, DE.CM-01

**Workflow applied:**
- Step 1: Check for Content-Security-Policy header
- Step 2: Check for X-Frame-Options header
- Step 3: Check for Strict-Transport-Security header
- Step 4: Check for X-Content-Type-Options header
- Step 5: Check cookie security attributes (HttpOnly, Secure, SameSite)

**How it works:** Audits HTTP response headers and cookie attributes to identify missing browser-level protections against XSS, clickjacking, and data leakage.

**Result:** `next.config.js` has no security headers configured. Auth cookies lack `HttpOnly` flag.

---

### Skill 5: `implementing-api-rate-limiting-and-throttling`
**File:** `skills/implementing-api-rate-limiting-and-throttling/SKILL.md`
**MITRE ATT&CK:** T1110, T1190
**NIST CSF:** PR.PS-01, DE.CM-01

**Workflow applied:**
- Step 1: Check rate limiting on all endpoints
- Step 2: Verify per-user and per-IP limits
- Step 3: Check if webhook endpoints have appropriate limits
- Step 4: Test for DoS via large payloads

**How it works:** Implements and validates rate limiting using token bucket, sliding window, or fixed window algorithms. Checks per-user, per-IP, and per-endpoint limits.

**Result:** Webhook rate limit is 1000/second (effectively unlimited). ML bridge has zero rate limiting. 50MB JSON body limit on backend.

---

### Skill 6: `performing-api-security-testing-with-postman`
**File:** `skills/performing-api-security-testing-with-postman/SKILL.md`
**MITRE ATT&CK:** T1190
**NIST CSF:** PR.PS-01, ID.RA-01

**Workflow applied:**
- Step 1: Map all API endpoints
- Step 2: Test each endpoint without auth tokens
- Step 3: Test with invalid/malformed tokens
- Step 4: Test IDOR by swapping company_id values

**How it works:** Systematic API security testing following OWASP API Security Top 10 — tests authentication bypass, authorization flaws, injection, and data exposure.

**Result:** Both backend and frontend optimization endpoints accept any `company_id` without verifying caller ownership.

---

### Skill 7: `deploying-osquery-for-endpoint-monitoring` (modified for code review)
**Used for:** Scanning console.log statements and error handling

**Workflow applied:**
- Grepped all source files for `console.log`, `console.error`, `console.warn`
- Checked if sensitive data (keys, tokens, URLs) appears in log output

**Result:** Supabase key partially logged (`index.ts:32`), env vars logged to browser console (`optimization-engine.ts:63`), ML status endpoint returns env var values (`ml/status/route.ts:12-18`).

---

### Skill 8: `scanning-containers-with-trivy-in-cicd` (adapted for npm audit)
**Used for:** Dependency vulnerability scanning

**Workflow applied:**
- Ran `npm audit` on both backend and frontend
- Checked for known CVEs in direct and transitive dependencies

**Result:** 25 moderate severity vulnerabilities in backend (js-yaml DoS, uuid buffer check).

---

## 2. CRITICAL Findings

### C1. No Authentication on Backend `/api/optimize` — IDOR

**Skill:** `testing-for-broken-access-control` Step 3 (IDOR testing)
**File:** `backend/src/index.ts:75-84`
**Severity:** CRITICAL

**Actual code (lines 75-84):**
```typescript
app.post('/api/optimize', async (req, res) => {
  const startTime = Date.now();
  console.log(`\n[OPTIMIZE] Request received at ${new Date().toISOString()}`);

  try {
    const { rawRows, companyId, runId } = req.body as {
      rawRows: CSVRow[];
      companyId: string;
      runId: string;
    };
```

**What the code does:** The endpoint accepts `companyId` and `runId` directly from the request body. There is no check for:
- Whether the caller is authenticated (no Firebase token verification)
- Whether the caller owns the `companyId` (no ownership check)
- Any session or JWT validation

**How this affects the application:**
- Any anonymous HTTP client can POST to `/api/optimize` with any `companyId`
- Attacker can read box catalogs of ALL companies (line 115-120: `supabase.from('box_catalog').select('*').eq('company_id', companyId)`)
- Attacker can INSERT optimized orders into ANY company's database (line 153-156)
- Attacker can CREATE shipments for ANY company (line 186)
- Attacker can UPDATE analytics and sustainability metrics for ANY company (lines 219-248)
- Attacker can INCREMENT subscription usage for ANY company (line 211-213)
- Combined with C3 (service role key), there is **zero access control** on the entire database

**Proof of exploit:** `curl -X POST http://localhost:8080/api/optimize -H "Content-Type: application/json" -d '{"rawRows":[{"order_id":"ORD-1","product_length":10,"product_width":10,"product_height":10,"fragility_score":1,"used_box_length":20,"used_box_width":20,"used_box_height":20,"used_box_price":5,"shipping_zone":"US"}],"companyId":"<any-uuid>","runId":"<any-uuid>"}'`

---

### C2. Backend CORS Reflects Any Origin with Credentials

**Skill:** `testing-cors-misconfiguration` Steps 1-3
**File:** `backend/src/index.ts:13-17`
**Severity:** CRITICAL

**Actual code (lines 13-17):**
```typescript
// CORS: Allow all origins — frontend can be on any Vercel/Netlify/localhost URL
app.use(cors({
  origin: true,
  credentials: true,
}));
```

**What the code does:** `origin: true` tells the `cors` middleware to reflect the requesting `Origin` header back as `Access-Control-Allow-Origin`. Combined with `credentials: true`, this means any website can make authenticated cross-origin requests to this API.

**How this affects the application:**
- An attacker hosts `evil.com` with JavaScript that calls `fetch('http://your-backend:8080/api/optimize', {credentials: 'include'})`
- If a user is tricked into visiting `evil.com`, their browser sends any cookies/auth to your backend
- The reflected CORS header makes the browser allow the cross-origin request
- Attacker can read all API responses (data exfiltration)
- Attacker can write to the API (data manipulation)

**Proof of exploit:** `curl -H "Origin: https://evil.com" -I http://localhost:8080/api/optimize` → response includes `Access-Control-Allow-Origin: https://evil.com` and `Access-Control-Allow-Credentials: true`

---

### C3. Supabase Service Role Key Used Directly — RLS Bypass

**Skill:** `implementing-secrets-management-with-vault` Steps 1-2
**File:** `backend/src/config/supabase.ts:7-16` and `backend/src/index.ts:24-35`
**Severity:** CRITICAL

**Actual code (supabase.ts lines 7-16):**
```typescript
export const supabase: SupabaseClient = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

**Actual code (index.ts lines 24-27):**
```typescript
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```

**What the code does:** The backend initializes Supabase with the service role key, which bypasses ALL Row Level Security (RLS) policies. Every database query runs with full admin access.

**How this affects the application:**
- RLS is the database-level access control that restricts which rows each user can see/modify
- With the service role key, every query bypasses RLS completely
- Combined with C1 (no auth on `/api/optimize`), any anonymous user gets full admin database access
- If an attacker discovers the service role key, they have permanent full database access

---

### C4. Frontend Auth Cookie is Unsigned and Client-Settable

**Skill:** `testing-for-broken-access-control` Step 2 (auth bypass testing)
**File:** `frontend/lib/auth-cookies.ts:1-6`
**Severity:** CRITICAL

**Actual code (lines 1-6):**
```typescript
export function setAuthCookie(uid: string): void {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `shipzi-auth=${uid}; path=/; max-age=86400; SameSite=Strict${secure}`
}
```

**What the code does:** The auth cookie is set client-side via `document.cookie`. It stores the raw Firebase UID with:
- No HMAC or signature (trivially forged)
- No `HttpOnly` flag (accessible to JavaScript)
- No server-side session token
- The value is just a UUID that anyone can generate

**How this affects the application:**
- Any user can open browser DevTools and run: `document.cookie = "shipzi-auth=<victim-uid>; path=/"`
- The middleware (line 6 of `middleware.ts`) checks only for the cookie's presence, not its validity
- This allows impersonating ANY user by setting their Firebase UID as the cookie value
- Combined with C5, this is a complete authentication bypass

---

### C5. Frontend Middleware Auth Bypass

**Skill:** `testing-for-broken-access-control` Step 2 (auth bypass testing)
**File:** `frontend/middleware.ts:4-14`
**Severity:** CRITICAL

**Actual code (lines 4-14):**
```typescript
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authCookie = request.cookies.get('shipzi-auth')
  const onboardingComplete = request.cookies.get('shipzi-onboarding-complete')

  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname === '/onboarding'
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  if (isProtectedRoute && !authCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
```

**What the code does:** The middleware checks if `authCookie` exists (line 12). It does NOT:
- Verify the cookie is a valid session token
- Check a server-side session store
- Verify a JWT signature
- Validate the UID belongs to a real user

**How this affects the application:**
- Setting `document.cookie = "shipzi-auth=anything"` bypasses all route protection
- Access to `/dashboard`, `/onboarding`, and all protected routes is granted
- The `onboarding-complete` cookie (line 7) is also client-controlled, allowing skip of onboarding

---

### C6. Frontend API Route Has No Server-Side Auth

**Skill:** `performing-api-security-testing-with-postman` Step 2 (auth bypass testing)
**File:** `frontend/app/api/optimize/bulk/route.ts:50-63`
**Severity:** CRITICAL

**Actual code (lines 50-63):**
```typescript
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { rows, mode, catalog_id, run_id, company_id } = body as {
      rows: any[],
      mode: 'single' | 'multi',
      catalog_id: string,
      run_id: string,
      company_id: string
    }

    if (!company_id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
```

**What the code does:** The "authentication" check is only `if (!company_id)` (line 61). This means:
- No Firebase ID token verification
- No session validation
- No user ownership check
- Any POST with a `company_id` field passes

**How this affects the application:**
- An unauthenticated attacker sends: `curl -X POST /api/optimize/bulk -H "Content-Type: application/json" -d '{"rows":[...],"company_id":"<victim-uuid>","run_id":"<any>","mode":"single"}'`
- The endpoint reads the victim's box catalog (line 65-68)
- Inserts orders into the victim's database (lines 200-203)
- Creates shipments for the victim (lines 234-238)
- Updates the victim's analytics (lines 264-274)
- All data operations use the client-provided `company_id` with no verification

---

## 3. HIGH Findings

### H1. ML Status Endpoint Leaks Server-Side Environment Variables

**Skill:** `implementing-secrets-management-with-vault` Step 3 (log leakage)
**File:** `frontend/app/api/ml/status/route.ts:12-18`
**Severity:** HIGH

**Actual code (lines 12-18):**
```typescript
const debug = {
  mlUrl,
  mlEnabled,
  ML_BRIDGE_URL: process.env.ML_BRIDGE_URL || '(not set)',
  NEXT_PUBLIC_ML_BRIDGE_URL: process.env.NEXT_PUBLIC_ML_BRIDGE_URL || '(not set)',
  NEXT_PUBLIC_ML_BRIDGE_ENABLED: process.env.NEXT_PUBLIC_ML_BRIDGE_ENABLED || '(not set)',
}
```

**What the code does:** This GET endpoint returns the actual values of server-side environment variables in the JSON response. It has no authentication.

**How this affects the application:**
- Anyone can `GET /api/ml/status` and see the ML bridge URL (internal infrastructure)
- Reveals whether env vars are configured or not
- Attacker learns the internal service topology for further attacks

---

### H2. Supabase Key Partially Logged to Console

**Skill:** `implementing-secrets-management-with-vault` Step 3
**File:** `backend/src/index.ts:32`
**Severity:** HIGH

**Actual code (line 32):**
```typescript
console.log(`Supabase client initialized — URL: ${supabaseUrl.slice(0, 30)}… Key: ${supabaseKey.slice(0, 8)}…`);
```

**What the code does:** Logs the first 8 characters of the Supabase key to stdout.

**How this affects the application:**
- In production logs (Render dashboard, centralized logging), the key prefix is visible
- First 8 characters narrow down brute-force space significantly
- If logs are shared or accessible to multiple team members, the key is partially exposed

---

### H3. 50MB JSON Body Limit — DoS Vector

**Skill:** `implementing-api-rate-limiting-and-throttling` Step 4
**File:** `backend/src/index.ts:18`
**Severity:** HIGH

**Actual code (line 18):**
```typescript
app.use(express.json({ limit: '50mb' }));
```

**What the code does:** Allows incoming JSON request bodies up to 50MB.

**How this affects the application:**
- An attacker can send a 50MB JSON payload to exhaust server memory
- With the free tier on Render (limited RAM), this can crash the service
- Combined with no rate limiting on this endpoint, repeated large payloads cause sustained DoS

---

### H4. Client-Side-Only Subscription Limits — Bypassable

**Skill:** `testing-for-broken-access-control` Step 4 (privilege escalation)
**File:** `frontend/context/SubscriptionContext.tsx:31-34`
**Severity:** HIGH

**Actual code (lines 31-34):**
```typescript
const FREE_LIMITS = {
  monthly_optimizations: 10,
  max_rows_per_upload: 50,
}
```

**What the code does:** Subscription limits are enforced entirely in React state on the client. The `canOptimize` and `canUploadRows` functions check these values in the browser.

**How this affects the application:**
- A free-tier user can bypass limits by:
  - Disabling JavaScript and calling the API directly
  - Modifying React state via browser DevTools
  - Directly calling `/api/optimize/bulk` with any number of rows
- No server-side enforcement means unlimited free usage

---

### H5. Webhook Body Parser Has No Size Limit — Memory DoS

**Skill:** `implementing-api-rate-limiting-and-throttling` Step 4
**File:** `backend/src/middlewares/webhook.middleware.ts:9-21`
**Severity:** HIGH

**Actual code (lines 9-21):**
```typescript
export function webhookBodyParser(req: WebhookRequest, _res: Response, next: NextFunction): void {
  if (req.method === 'POST' && req.headers['content-type']?.includes('application/json')) {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      req.rawBody = Buffer.concat(chunks);
      try {
        req.body = JSON.parse(req.rawBody.toString('utf8'));
      } catch {
        req.body = {};
      }
      next();
    });
```

**What the code does:** Accumulates all incoming data chunks into a buffer with no size limit.

**How this affects the application:**
- An attacker can send a massive POST body to the webhook endpoint
- Memory fills up until the process crashes
- The webhook rate limit (1000/sec) does not prevent this — each request can be large

---

### H6. ML Bridge Has Zero Authentication

**Skill:** `performing-api-security-testing-with-postman` Step 2
**File:** `backend/ml_bridge/ml_bridge.py:205-259`
**Severity:** HIGH

**Actual code (lines 205-214):**
```python
@app.route('/ml/single', methods=['POST'])
def single_optimize():
    try:
        data = request.json
        valid, err = _validate_input(data)
        if not valid:
            return jsonify({"error": err}), 400
            
        result = _predict_single(data)
        return jsonify(result), 200
```

**What the code does:** Accepts POST requests from anyone with zero authentication. No API key, no token, no session check.

**How this affects the application:**
- Anyone on the internet can call the ML inference API
- No rate limiting means unlimited free ML predictions
- The `/ml/bulk` endpoint allows 10,000 items per request
- Could be used for resource exhaustion or model extraction attacks

---

## 4. MEDIUM Findings

### M1. ML Bridge CORS Wildcard

**Skill:** `testing-cors-misconfiguration` Step 1
**File:** `backend/ml_bridge/ml_bridge.py:26`
**Severity:** MEDIUM

**Actual code (line 26):**
```python
CORS(app)
```

**What the code does:** Enables CORS for all origins (`*`) with default settings.

**How this affects the application:** Any website can make cross-origin requests to the ML bridge. Combined with H6 (no auth), any webpage can run ML inferences using your compute resources.

---

### M2. ML Bridge Unsafe Pickle Deserialization

**Skill:** (General secure coding review)
**File:** `backend/ml_bridge/ml_bridge.py:47`
**Severity:** MEDIUM (escalates to CRITICAL if model files are tampered with)

**Actual code (line 47):**
```python
models[f] = joblib.load(full_path)
```

**What the code does:** Loads `.pkl` files using `joblib.load()`, which uses Python pickle deserialization. Pickle can execute arbitrary code during deserialization.

**How this affects the application:**
- If an attacker can write to the model directory (supply chain attack, compromised CI, shared volume), they can create a malicious `.pkl` file
- When `joblib.load()` processes it, arbitrary Python code executes in the container
- Currently mitigated by model files being baked into the Docker image at build time

---

### M3. Request ID Injection

**Skill:** (General input validation review)
**File:** `backend/src/middlewares/requestId.middleware.ts:7`
**Severity:** MEDIUM

**What the code does:** Trusts the user-supplied `X-Request-ID` header without validation.

**How this affects the application:** An attacker can inject newlines or special characters into the request ID, potentially causing log injection or log forging in centralized logging systems.

---

### M4. Razorpay Response Stored Unsanitized in Database

**Skill:** `implementing-secrets-management-with-vault` Step 1
**File:** `backend/src/services/subscription.service.ts:36`
**Severity:** MEDIUM

**Actual code (line 36):**
```typescript
metadata: { razorpay_response: subscription },
```

**What the code does:** Stores the full Razorpay API response object directly in the database.

**How this affects the application:** The Razorpay response may contain sensitive internal data (API endpoints, internal IDs, customer metadata). Storing it verbatim in the database exposes it to anyone with database read access.

---

### M5. File Upload Lacks Server-Side Validation

**Skill:** (General secure coding review)
**File:** `frontend/app/onboarding/page.tsx:80-107`
**Severity:** MEDIUM

**Actual code (lines 87-89):**
```typescript
const ext = file.name.split('.').pop() ?? 'png'
const path = `${firebaseUser?.uid ?? 'anon'}/logo.${ext}`
const { error } = await supabase.storage.from('company-logos').upload(path, file, { upsert: true })
```

**What the code does:** Takes the file extension from the user-supplied filename without validating the actual file content.

**How this affects the application:**
- Client-side `accept=".png,.jpg,.svg"` is trivially bypassed
- An attacker can upload a `.html` or `.svg` file with embedded JavaScript
- If Supabase storage serves these files without a Content-Type header, the browser may execute the script
- Stored XSS possible if the logo URL is rendered in other users' browsers

---

### M6. Onboarding Cookie is Client-Controlled

**Skill:** `testing-for-broken-access-control` Step 2
**File:** `frontend/lib/auth-cookies.ts:8-12`
**Severity:** MEDIUM

**Actual code (lines 8-12):**
```typescript
export function setOnboardingComplete(): void {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `shipzi-onboarding-complete=true; path=/; max-age=31536000; SameSite=Strict${secure}`
}
```

**What the code does:** Sets a client-side cookie to mark onboarding as complete.

**How this affects the application:** A new user can set this cookie to skip the onboarding flow entirely, potentially accessing a dashboard that requires company setup.

---

### M7. Idempotency Key Not Bound to User

**Skill:** (General API security review)
**File:** `backend/src/services/payment.service.ts:48-57`
**Severity:** MEDIUM

**What the code does:** The idempotency check doesn't verify the key belongs to the requesting user.

**How this affects the application:** An attacker who knows or guesses another user's idempotency key can replay or intercept an order response.

---

## 5. LOW Findings

### L1. No CSP Headers in Next.js Config

**Skill:** `performing-security-headers-audit` Step 1
**File:** `frontend/next.config.js:1-14`
**Severity:** LOW

**Actual code (entire file):**
```javascript
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com', 'firebasestorage.googleapis.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}
module.exports = nextConfig
```

**What the code does:** The Next.js config only configures image domains. No security headers are set.

**How this affects the application:** No Content-Security-Policy means no restriction on script sources, no frame-ancestors protection, and no connect-src restrictions. The app can be embedded in iframes (clickjacking).

---

### L2. No X-Frame-Options or Frame Protection

**Skill:** `performing-security-headers-audit` Step 2
**File:** `frontend/next.config.js` (same as L1)
**Severity:** LOW

**How this affects the application:** The app can be embedded in an iframe on any domain, enabling clickjacking attacks where an attacker overlays invisible elements to trick users into clicking.

---

### L3. Razorpay Script Loaded Without SRI

**Skill:** (General supply chain review)
**File:** `frontend/utils/loadRazorpay.ts:9,33-35`
**Severity:** LOW

**Actual code (lines 9, 33-35):**
```typescript
const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
// ...
script.src = RAZORPAY_SCRIPT_URL;
```

**What the code does:** Loads the Razorpay checkout script from their CDN without a Subresource Integrity (SRI) hash.

**How this affects the application:** If Razorpay's CDN is compromised, arbitrary JavaScript runs on your domain with full access to user sessions and data.

---

### L4. Hardcoded Demo Company ID

**Skill:** (General application logic review)
**File:** `frontend/context/UserContext.tsx:45`
**Severity:** LOW

**Actual code (line 45):**
```typescript
company_id: '00000000-0000-0000-0000-000000000001', // Default to demo company
```

**What the code does:** All new users are automatically assigned to a hardcoded demo company.

**How this affects the application:** If this company has real data or other users, new users gain access to it. If it's a true demo company with test data, the impact is minimal.

---

### L5. Potential Prototype Pollution in CSV Parsing

**Skill:** (General input validation review)
**File:** `frontend/lib/optimization-engine.ts:91-141`
**Severity:** LOW

**What the code does:** CSV rows are parsed and validated, but the validation doesn't check for prototype-polluting keys like `__proto__` or `constructor`.

**How this affects the application:** If `Papa.parse` passes through prototype-polluting keys, an attacker could modify `Object.prototype` affecting all objects in the application. Modern browsers and PapaParse generally mitigate this.

---

## 6. Dependency Vulnerabilities

**Skill:** `scanning-containers-with-trivy-in-cicd` (adapted for npm)
**Source:** `npm audit` on backend

| Package | Severity | Issue |
|---------|----------|-------|
| `js-yaml <=4.1.1` | Moderate | Quadratic-complexity DoS in merge key handling |
| `uuid <11.1.1` | Moderate | Missing buffer bounds check in v3/v5/v6 |

**Total:** 25 moderate severity vulnerabilities (all via transitive dependencies of `jest` and `firebase-admin`)

**Fix:** `npm audit fix --force` (breaking changes required)

---

## 7. Impact Analysis

### Attack Scenario 1: Full Data Exfiltration (C1 + C2 + C3)
1. Attacker visits your frontend, opens DevTools, notes the backend URL
2. Attacker creates `evil.com` with JavaScript that calls your backend API
3. Due to C2 (CORS reflection), the browser allows the cross-origin request
4. Due to C1 (no auth), the request succeeds
5. Due to C3 (service role key), all database data is accessible
6. **Result:** All company data, orders, shipments, analytics, and sustainability metrics are stolen

### Attack Scenario 2: User Impersonation (C4 + C5)
1. Attacker opens browser DevTools on your site
2. Runs: `document.cookie = "shipzi-auth=<victim-firebase-uid>; path=/"`
3. Due to C5 (middleware only checks cookie presence), all protected routes are accessible
4. Attacker sees the victim's dashboard, company data, and optimization history
5. **Result:** Complete account takeover without knowing the password

### Attack Scenario 3: Resource Exhaustion (H3 + H5 + H6)
1. Attacker sends multiple 50MB JSON payloads to `/api/optimize` (H3)
2. Attacker sends large payloads to webhook endpoint (H5)
3. Attacker calls ML bridge `/ml/bulk` with 10,000 items repeatedly (H6)
4. **Result:** Service crashes due to memory exhaustion, legitimate users cannot access the app

### Attack Scenario 4: Free Tier Abuse (H4)
1. Free-tier user opens DevTools
2. Disables JavaScript, calls `/api/optimize/bulk` directly with unlimited rows
3. **Result:** Unlimited free ML optimizations, no revenue from free tier

---

## 8. Remediation Roadmap

### Phase 1: Critical (Do immediately — blocks production deployment)

| Fix | Skill | Effort |
|-----|-------|--------|
| Add Firebase ID token verification to `/api/optimize` and `/api/optimize/bulk` | `testing-for-broken-access-control` | 2-4 hours |
| Verify caller owns the `company_id` (query users table for auth token → company mapping) | `testing-for-broken-access-control` | 1-2 hours |
| Change CORS to explicit origin: `origin: 'https://your-domain.com'` | `testing-cors-misconfiguration` | 15 minutes |
| Implement server-side session tokens (JWT or Supabase Auth session) | `implementing-secure-authentication` | 4-8 hours |
| Replace client-side auth cookie with server-side verified session | `implementing-secure-authentication` | 2-4 hours |

### Phase 2: High (Before production traffic)

| Fix | Skill | Effort |
|-----|-------|--------|
| Remove `NEXT_PUBLIC_` from `OPENROUTER_KEY`, proxy through API route | `implementing-secrets-management-with-vault` | 1 hour |
| Add API key auth to ML bridge endpoints | `performing-api-security-testing-with-postman` | 2 hours |
| Reduce JSON body limit to 1MB | `implementing-api-rate-limiting-and-throttling` | 5 minutes |
| Add rate limiting to ML bridge (per-IP) | `implementing-api-rate-limiting-and-throttling` | 1 hour |
| Add size limit to webhook body parser | `implementing-api-rate-limiting-and-throttling` | 15 minutes |
| Move subscription enforcement to server-side | `testing-for-broken-access-control` | 4-6 hours |

### Phase 3: Medium (Before scale)

| Fix | Effort |
|-----|--------|
| Add CSP, X-Frame-Options, HSTS headers | 1 hour |
| Add HttpOnly flag to auth cookies | 30 minutes |
| Add SRI hash to Razorpay script | 15 minutes |
| Add file upload content-type validation | 1 hour |
| Add server-side file upload validation | 2 hours |
| Restrict ML bridge CORS to specific origins | 15 minutes |
| Add SHA-256 checksum verification for .pkl files | 1 hour |

### Phase 4: Low (Ongoing)

| Fix | Effort |
|-----|--------|
| Run `npm audit fix --force` | 30 minutes |
| Remove hardcoded demo company ID | 1 hour |
| Add prototype pollution checks to CSV validation | 30 minutes |
| Remove `__pycache__` from repo | 5 minutes |

---

## Appendix: Skill-to-Finding Mapping

| Finding | Skill Used | Skill File | Workflow Step |
|---------|-----------|------------|---------------|
| C1: No auth on /api/optimize | testing-for-broken-access-control | SKILL.md | Step 2-3: Test endpoint without auth |
| C2: CORS wildcard | testing-cors-misconfiguration | SKILL.md | Step 1-3: Check CORS headers |
| C3: Service role key | implementing-secrets-management-with-vault | SKILL.md | Step 1-2: Scan for hardcoded creds |
| C4: Unsigned auth cookie | testing-for-broken-access-control | SKILL.md | Step 2: Test auth bypass |
| C5: Middleware auth bypass | testing-for-broken-access-control | SKILL.md | Step 2: Test auth bypass |
| C6: No server-side auth | performing-api-security-testing-with-postman | SKILL.md | Step 2: Test without auth tokens |
| H1: Env var leakage | implementing-secrets-management-with-vault | SKILL.md | Step 3: Check log leakage |
| H2: Key logged | implementing-secrets-management-with-vault | SKILL.md | Step 3: Check log leakage |
| H3: 50MB body limit | implementing-api-rate-limiting-and-throttling | SKILL.md | Step 4: Test for DoS |
| H4: Client-side limits | testing-for-broken-access-control | SKILL.md | Step 4: Privilege escalation |
| H5: Webhook no size limit | implementing-api-rate-limiting-and-throttling | SKILL.md | Step 4: Test for DoS |
| H6: ML no auth | performing-api-security-testing-with-postman | SKILL.md | Step 2: Test without auth |
| M1: ML CORS wildcard | testing-cors-misconfiguration | SKILL.md | Step 1: Check CORS |
| M2: Pickle deserialization | (secure coding review) | — | — |
| M3: Request ID injection | (input validation review) | — | — |
| M4: Unsanitized DB write | implementing-secrets-management-with-vault | SKILL.md | Step 1: Scan for data exposure |
| M5: No file validation | (secure coding review) | — | — |
| M6: Onboarding cookie | testing-for-broken-access-control | SKILL.md | Step 2: Auth bypass |
| M7: Idempotency key | (API security review) | — | — |
| L1: No CSP | performing-security-headers-audit | SKILL.md | Step 1: Check CSP |
| L2: No X-Frame-Options | performing-security-headers-audit | SKILL.md | Step 2: Check frame protection |
| L3: No SRI on Razorpay | (supply chain review) | — | — |
| L4: Hardcoded company ID | (application logic review) | — | — |
| L5: Prototype pollution | (input validation review) | — | — |
| Deps: js-yaml, uuid | scanning-containers-with-trivy-in-cicd | SKILL.md | Dependency CVE scan |
