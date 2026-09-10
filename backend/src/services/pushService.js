import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

// Standard Web Push via VAPID keys you generate yourself (see README) — this is
// the actual browser Push API, not a third-party push service, so there's no
// account, quota, or cost involved. Works on Android (Chrome) reliably; iOS
// Safari supports it too, but only once the PWA has been added to the home
// screen (iOS 16.4+) — push doesn't work in a regular Safari tab on iPhone.
let configured = false;

export const initWebPush = () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT_EMAIL } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("⚠️  Push notifications disabled — VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set in .env");
    return;
  }
  webpush.setVapidDetails(
    `mailto:${VAPID_CONTACT_EMAIL || "admin@example.com"}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  configured = true;
  console.log("✅ Push notifications enabled");
};

export const isPushConfigured = () => configured;

// Sends a notification to every device a user has registered, and cleans up
// any subscription the browser reports as gone (410/404 — e.g. uninstalled app).
export const sendPushToUser = async (userId, payload) => {
  if (!configured) return;

  const subscriptions = await PushSubscription.find({ user: userId });
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload)
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error("Push send failed:", err.message);
        }
      }
    })
  );
};
