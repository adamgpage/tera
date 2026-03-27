import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn("STRIPE_SECRET_KEY not set — Stripe calls will fail gracefully");
    stripeInstance = new Stripe("sk_test_placeholder", { apiVersion: "2026-03-25.dahlia" });
    return stripeInstance;
  }

  stripeInstance = new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" });
  return stripeInstance;
}
