import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — emails will be logged to console");
    // Return client that will fail gracefully
    resendClient = new Resend("re_placeholder");
    return resendClient;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

export const FROM_EMAIL = "Tera <notifications@tera.com>";
export const REPLY_TO = "support@tera.com";
