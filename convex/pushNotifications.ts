"use node";

import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import webpush from "web-push";

function setupWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? ""
  );
}

export const sendPushToUser = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.runQuery(api.pushSubscriptions.getSubscription, {
      userId: args.userId,
    });
    if (!sub) return;

    setupWebPush();
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: args.title, body: args.body, url: args.url ?? "/dashboard" })
      );
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "statusCode" in err &&
        (err as { statusCode: number }).statusCode === 410
      ) {
        await ctx.runMutation(internal.pushSubscriptions.removeSubscriptionInternal, {
          userId: args.userId,
        });
      }
    }
  },
});
