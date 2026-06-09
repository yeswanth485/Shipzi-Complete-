# Shipzi — AI Packaging Optimization SaaS

**Stack:** Next.js 14 · TypeScript · Supabase · Firebase Auth · Three.js · Recharts · Framer Motion

---

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/yourorg/shipzi.git
cd shipzi
npm install
```

### 2. Environment Variables
Copy `.env.local` and fill in your credentials:
```bash
cp .env.local .env.local.filled
```

Required keys:
| Key | Where to find |
|-----|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Console → Project Settings |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Console → Project Settings |
| `NEXT_PUBLIC_OPENROUTER_KEY` | openrouter.ai → Keys (optional — AI explanations) |

### 3. Supabase Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_bulk_optimization_schema.sql`
3. Go to **Storage → New Bucket** → name it `company-logos` → set to **Public**
4. Go to **Authentication → Providers** → enable **Email** and **Google**

### 4. Firebase Setup
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication → Email/Password** and **Google**
3. Copy the Web App credentials into `.env.local`

### 5. Run
```bash
npm run dev
# open http://localhost:3000
```

---

## File Structure

```
shipzi/
├── app/
│   ├── page.tsx                    # Landing page (animated)
│   ├── login/page.tsx              # Login (email + Google)
│   ├── signup/page.tsx             # Sign up
│   ├── onboarding/page.tsx         # 3-step onboarding wizard
│   └── dashboard/
│       ├── layout.tsx              # Sidebar + topbar
│       ├── page.tsx                # Main dashboard (charts + KPIs)
│       ├── optimize/page.tsx       # Bulk CSV optimization (2K–10K rows)
│       ├── orders/page.tsx         # Orders table + 3D box viewer
│       ├── shipments/page.tsx      # Shipment tracking
│       ├── box-catalog/page.tsx    # Box CRUD + 3D preview
│       ├── analytics/page.tsx      # Charts & trends
│       ├── sustainability/page.tsx # Eco metrics & milestones
│       └── settings/page.tsx       # Profile, company, billing, API keys
├── components/
│   ├── HeroScene.tsx               # Three.js landing hero
│   └── BoxViewer3D.tsx             # 3D box+product viewer
├── context/
│   └── UserContext.tsx             # Firebase + Supabase user state
├── lib/
│   ├── types.ts                    # All TypeScript interfaces (CSV, DB, engine)
│   ├── optimization-engine.ts      # FFD algorithm + bulk processor
│   ├── supabase.ts                 # Supabase client + DB types
│   ├── firebase.ts                 # Firebase app init
│   └── auth-cookies.ts             # Cookie helpers for middleware
├── supabase/migrations/
│   ├── 001_initial_schema.sql      # Base schema + RLS
│   └── 002_bulk_optimization_schema.sql  # Schema alignment for bulk
└── middleware.ts                   # Route protection
```

---

## CSV Upload Format

Required columns for the Optimize tab:

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| `product_name` | text | Wireless Earbuds | Identifier |
| `product_length` | number | 12 | cm |
| `product_width` | number | 8 | cm |
| `product_height` | number | 6 | cm |
| `used_box_length` | number | 20 | cm — current box |
| `used_box_width` | number | 15 | cm — current box |
| `used_box_height` | number | 10 | cm — current box |
| `fragility_score` | number | 7 | 0 (robust) – 10 (fragile) |
| `used_box_price` | number | 1.40 | $ cost of current box |
| `shipping_zone` | text | Zone 3 | Zone 1–8 or International |

Download a sample CSV from inside the app → Optimize tab → "Required CSV Columns".

---

## Optimization Engine Rules

1. **Fragility padding** — added to min required dimensions: score ≥8 → +3cm, ≥5 → +1.5cm, else +0.5cm
2. **Geometric constraint** — box must be ≥ (product + padding) in all 3 dimensions
3. **Weight constraint** — box `max_weight_kg` must be ≥ product weight × quantity
4. **Scoring** — utilization 55% + cost efficiency 30% + eco score 15%
5. **DIM weight** — calculated as `L×W×H / 5000`
6. **Savings** — `(used_box_price + original_shipping) − (optimized_box_price + new_shipping)`
7. **Batch safety** — one invalid row never aborts the batch; it is logged separately

---

## Auth Flow

```
New user   → signup → onboarding wizard (3 steps) → dashboard
Existing user → login → check onboarding_complete in Supabase
                ├── false → /onboarding
                └── true  → /dashboard
Google login → same check after OAuth
```

---

## Deployment

### Vercel (recommended)
```bash
npm install -g vercel
vercel --prod
```
Set all `NEXT_PUBLIC_*` env vars in the Vercel dashboard.

### Docker
```bash
docker build -t shipzi .
docker run -p 3000:3000 --env-file .env.local shipzi
```

---

## Database: Row Level Security

Every table is protected by RLS. Users can only access rows where `company_id` matches their own company. This is enforced at the database level — not just the application.

---

## License
MIT © 2026 Shipzi Inc.
