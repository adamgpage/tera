import { getStripe } from "./client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Create a Stripe Connect Express account for a helper.
 * Returns the account ID.
 */
export async function createConnectAccount(email: string, name: string): Promise<string> {
  const stripe = getStripe();

  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: { platform: "tera" },
  });

  return account.id;
}

/**
 * Generate an onboarding link for a Connect account.
 */
export async function createOnboardingLink(accountId: string): Promise<string> {
  const stripe = getStripe();

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${APP_URL}/api/stripe/connect?refresh=true`,
    return_url: `${APP_URL}/api/stripe/connect/callback`,
    type: "account_onboarding",
  });

  return link.url;
}

/**
 * Check if a Connect account has completed onboarding.
 */
export async function isAccountReady(accountId: string): Promise<boolean> {
  const stripe = getStripe();

  const account = await stripe.accounts.retrieve(accountId);
  return account.charges_enabled && account.payouts_enabled;
}

/**
 * Create a login link for a Connect account's Stripe dashboard.
 */
export async function createDashboardLink(accountId: string): Promise<string> {
  const stripe = getStripe();

  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}
