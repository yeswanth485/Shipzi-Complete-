// Shipzi subscription plans configuration.

export interface PlanConfig {
  id: string;
  name: string;
  amount: number; // in paise
  currency: string;
  interval: 'monthly' | 'annual';
  credits_per_cycle: number;
  razorpay_plan_id: string;
  description: string;
}

export const SUBSCRIPTION_PLANS: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    amount: 0,
    currency: 'INR',
    interval: 'monthly',
    credits_per_cycle: 0,
    razorpay_plan_id: '',
    description: '10 optimizations/month',
  },
  pro: {
    id: 'pro',
    name: 'Pro Monthly',
    amount: 249900,
    currency: 'INR',
    interval: 'monthly',
    credits_per_cycle: 5000,
    razorpay_plan_id: '',
    description: '5,000 optimizations/month',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Monthly',
    amount: 999900,
    currency: 'INR',
    interval: 'monthly',
    credits_per_cycle: -1,
    razorpay_plan_id: '',
    description: 'Unlimited optimizations',
  },
  pro_annual: {
    id: 'pro_annual',
    name: 'Pro Annual',
    amount: 199900,
    currency: 'INR',
    interval: 'annual',
    credits_per_cycle: 5000,
    razorpay_plan_id: '',
    description: '5,000 optimizations/month (2 months free)',
  },
  enterprise_annual: {
    id: 'enterprise_annual',
    name: 'Enterprise Annual',
    amount: 799900,
    currency: 'INR',
    interval: 'annual',
    credits_per_cycle: -1,
    razorpay_plan_id: '',
    description: 'Unlimited optimizations (2 months free)',
  },
  basic_monthly: {
    id: 'basic_monthly',
    name: 'Basic Monthly',
    amount: 49900,
    currency: 'INR',
    interval: 'monthly',
    credits_per_cycle: 100,
    razorpay_plan_id: 'plan_basic_monthly_rzp',
    description: '100 AI credits per month',
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    amount: 99900,
    currency: 'INR',
    interval: 'monthly',
    credits_per_cycle: 300,
    razorpay_plan_id: 'plan_pro_monthly_rzp',
    description: '300 AI credits per month',
  },
  basic_annual: {
    id: 'basic_annual',
    name: 'Basic Annual',
    amount: 499900,
    currency: 'INR',
    interval: 'annual',
    credits_per_cycle: 1200,
    razorpay_plan_id: 'plan_basic_annual_rzp',
    description: '1200 AI credits per year (2 months free)',
  },
  pro_annual_legacy: {
    id: 'pro_annual_legacy',
    name: 'Pro Annual',
    amount: 999900,
    currency: 'INR',
    interval: 'annual',
    credits_per_cycle: 3600,
    razorpay_plan_id: 'plan_pro_annual_rzp',
    description: '3600 AI credits per year (2 months free)',
  },
};

export interface CreditPackage {
  id: string;
  name: string;
  amount: number; // in paise
  credits: number;
  description: string;
}

export const CREDIT_PACKAGES: Record<string, CreditPackage> = {
  starter_pack: {
    id: 'starter_pack',
    name: 'Starter Pack',
    amount: 9900,
    credits: 50,
    description: '50 credits for ₹99',
  },
  growth_pack: {
    id: 'growth_pack',
    name: 'Growth Pack',
    amount: 29900,
    credits: 200,
    description: '200 credits for ₹299',
  },
  enterprise_pack: {
    id: 'enterprise_pack',
    name: 'Enterprise Pack',
    amount: 99900,
    credits: 750,
    description: '750 credits for ₹999',
  },
};

export function getPlanById(planId: string): PlanConfig | undefined {
  return SUBSCRIPTION_PLANS[planId];
}

export function getCreditPackageById(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES[packageId];
}

export function getAllPlans(): PlanConfig[] {
  return Object.values(SUBSCRIPTION_PLANS);
}

export function getAllCreditPackages(): CreditPackage[] {
  return Object.values(CREDIT_PACKAGES);
}
