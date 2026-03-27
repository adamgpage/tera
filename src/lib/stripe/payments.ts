import { getStripe } from "./client";
import { TERA_FEE_PERCENTAGE } from "@/lib/utils/constants";

/**
 * Create a payment intent with an authorization hold (capture later).
 * Amount is in cents. Currency defaults to USD.
 */
export async function createPaymentIntent(params: {
  amountCents: number;
  currency: string;
  helperStripeAccountId: string;
  conversationId: string;
  askerEmail: string;
}) {
  const stripe = getStripe();

  const feeCents = Math.round(params.amountCents * TERA_FEE_PERCENTAGE);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amountCents,
    currency: params.currency.toLowerCase(),
    capture_method: "manual", // Authorization hold — capture later
    payment_method_types: ["card"],
    application_fee_amount: feeCents,
    transfer_data: {
      destination: params.helperStripeAccountId,
    },
    metadata: {
      conversation_id: params.conversationId,
      platform: "tera",
    },
    receipt_email: params.askerEmail,
  });

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    feeCents,
    helperPayoutCents: params.amountCents - feeCents,
  };
}

/**
 * Capture a previously authorized payment intent.
 */
export async function capturePayment(paymentIntentId: string) {
  const stripe = getStripe();
  return stripe.paymentIntents.capture(paymentIntentId);
}

/**
 * Refund a payment intent. Supports full or partial refunds.
 */
export async function refundPayment(paymentIntentId: string, amountCents?: number) {
  const stripe = getStripe();

  const refundParams: { payment_intent: string; amount?: number; reverse_transfer?: boolean; refund_application_fee?: boolean } = {
    payment_intent: paymentIntentId,
    reverse_transfer: true,
    refund_application_fee: true,
  };

  if (amountCents) {
    refundParams.amount = amountCents;
  }

  return stripe.refunds.create(refundParams);
}

/**
 * Cancel an uncaptured payment intent (release the hold).
 */
export async function cancelPaymentIntent(paymentIntentId: string) {
  const stripe = getStripe();
  return stripe.paymentIntents.cancel(paymentIntentId);
}
