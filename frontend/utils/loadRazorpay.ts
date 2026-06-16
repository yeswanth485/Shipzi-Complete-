// Safely load Razorpay checkout.js script.

declare global {
  interface Window {
    Razorpay: new (options: any) => any;
  }
}

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const SCRIPT_ID = 'razorpay-checkout-script';

export function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    // Already loaded
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    // Check if script tag already exists
    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.head.appendChild(script);
  });
}
