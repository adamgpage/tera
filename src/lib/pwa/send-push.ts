import webpush from "web-push";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@tera.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a push notification to a user's subscribed device.
 * Falls back silently if push is not configured or subscription is invalid.
 */
export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return false;
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    const error = err as { statusCode?: number };
    // 410 = subscription expired/unsubscribed
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log("Push subscription expired, should clean up");
    } else {
      console.error("Push notification failed:", err);
    }
    return false;
  }
}
