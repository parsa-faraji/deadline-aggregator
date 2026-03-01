import webpush from "web-push";

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:noreply@deadline-aggregator.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  title: string,
  body: string
) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    console.log(`[Push] Would send: ${title} - ${body}`);
    return;
  }

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify({ title, body })
  );
}
