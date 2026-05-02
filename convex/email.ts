"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function fromAddress() {
  return process.env.RESEND_FROM_ADDRESS ?? "DailyReport <noreply@dailyreport.app>";
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://app.dailyreport.app";
}

// ── Email templates ────────────────────────────────────────────────────────

function baseHtml(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="font-size:18px;font-weight:800;color:#09090b;letter-spacing:-0.5px;">DailyReport</span>
  </div>
  ${content}
  <p style="text-align:center;font-size:12px;color:#a1a1aa;margin-top:32px;line-height:1.6;">
    You're receiving this because you have an account at DailyReport.<br>
    <a href="${appUrl()}/settings" style="color:#a1a1aa;">Manage email preferences</a>
  </p>
</div>
</body>
</html>`;
}

function statBlock(value: string, label: string, color: string) {
  return `<div style="flex:1;background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:16px;text-align:center;min-width:100px;">
  <p style="font-size:26px;font-weight:800;color:${color};margin:0;line-height:1;">${value}</p>
  <p style="font-size:11px;color:#71717a;margin:6px 0 0;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
</div>`;
}

function ctaButton(text: string, url: string) {
  return `<a href="${url}" style="display:inline-block;background:#09090b;color:#ffffff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:-0.2px;">${text}</a>`;
}

function weeklyDigestHtml(data: {
  name: string;
  reportsThisWeek: number;
  weeklyReportDone: boolean;
  goalsTotal: number;
  goalsCompleted: number;
  affirmDays: number;
  streak: number;
  weekLabel: string;
}) {
  const reportScore = `${data.reportsThisWeek}/7`;
  const goalScore = data.goalsTotal > 0 ? `${data.goalsCompleted}/${data.goalsTotal}` : "—";
  const streakLabel = data.streak === 1 ? "day streak" : "day streak";

  let message = "";
  if (data.reportsThisWeek === 7) {
    message = "Perfect week — you logged every single day. That kind of consistency is rare. Keep going.";
  } else if (data.reportsThisWeek >= 5) {
    message = `Strong week, ${data.name}. ${data.reportsThisWeek} out of 7 days logged. You're building something real here.`;
  } else if (data.reportsThisWeek >= 3) {
    message = `${data.reportsThisWeek} days logged this week. Not your best, but you showed up — and that counts. Let's push harder next week.`;
  } else if (data.reportsThisWeek > 0) {
    message = `You logged ${data.reportsThisWeek} day${data.reportsThisWeek > 1 ? "s" : ""} this week. The gap between where you are and where you want to be closes one report at a time.`;
  } else {
    message = `It was a quiet week, ${data.name}. No reports logged — but you're still here. This week is a fresh start.`;
  }

  const weeklyCtaNote = !data.weeklyReportDone
    ? `<p style="margin:20px 0 0;font-size:14px;color:#71717a;">You haven't completed your weekly review yet. <a href="${appUrl()}/reports/weekly" style="color:#09090b;font-weight:600;">Complete it now →</a></p>`
    : "";

  return baseHtml(`
<div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;padding:32px;">
  <p style="font-size:13px;color:#71717a;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Week in Review</p>
  <h1 style="font-size:22px;font-weight:800;color:#09090b;margin:0 0 4px;letter-spacing:-0.5px;">
    ${data.weekLabel}
  </h1>
  <p style="font-size:14px;color:#71717a;margin:0 0 28px;">Hi ${data.name},</p>

  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:28px;">
    ${statBlock(reportScore, "Days logged", "#09090b")}
    ${statBlock(String(data.streak), streakLabel, "#22c55e")}
    ${statBlock(goalScore, "Weekly goals", "#6366f1")}
    ${statBlock(`${data.affirmDays}d`, "Affirmations", "#f59e0b")}
  </div>

  <p style="font-size:15px;color:#3f3f46;line-height:1.7;margin:0 0 24px;">${message}</p>

  ${ctaButton("Open dashboard →", `${appUrl()}/dashboard`)}
  ${weeklyCtaNote}
</div>`);
}

function weeklyReminderHtml(name: string) {
  return baseHtml(`
<div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;padding:32px;">
  <h1 style="font-size:22px;font-weight:800;color:#09090b;margin:0 0 12px;letter-spacing:-0.5px;">
    Your weekly review is waiting
  </h1>
  <p style="font-size:15px;color:#3f3f46;line-height:1.7;margin:0 0 8px;">
    Hi ${name},
  </p>
  <p style="font-size:15px;color:#3f3f46;line-height:1.7;margin:0 0 28px;">
    You haven't submitted your weekly review yet. It takes less than 5 minutes and makes next week sharper.
    What did you learn? What worked? What didn't?
  </p>
  ${ctaButton("Complete weekly review →", `${appUrl()}/reports/weekly`)}
</div>`);
}

// ── Send actions ───────────────────────────────────────────────────────────

export const sendWeeklyDigestToUser = internalAction({
  args: { userId: v.id("users"), weekStartDate: v.string() },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.emailInternal.getDigestData, {
      userId: args.userId,
      weekStartDate: args.weekStartDate,
    });
    if (!data) return;

    const monday = new Date(args.weekStartDate);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const weekLabel = `${fmt(monday)} – ${fmt(sunday)}`;

    const resend = getResend();
    await resend.emails.send({
      from: fromAddress(),
      to: data.email,
      subject: `Your week in review — ${weekLabel}`,
      html: weeklyDigestHtml({ ...data, weekLabel }),
    });

    await ctx.runMutation(internal.emailInternal.markEmailSent, {
      userId: args.userId,
      type: "email_digest",
      date: args.weekStartDate,
    });
  },
});

export const sendWeeklyReminderToUser = internalAction({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.emailInternal.getDigestData, {
      userId: args.userId,
      weekStartDate: args.date, // won't actually be used for stats — just need name/email
    });
    if (!user) return;

    // Re-fetch just name + email (getDigestData doubles as a user lookup)
    const resend = getResend();
    await resend.emails.send({
      from: fromAddress(),
      to: user.email,
      subject: "Complete your weekly review",
      html: weeklyReminderHtml(user.name),
    });

    await ctx.runMutation(internal.emailInternal.markEmailSent, {
      userId: args.userId,
      type: "email_reminder",
      date: args.date,
    });
  },
});

// ── Batch cron actions ─────────────────────────────────────────────────────

export const sendWeeklyDigestToAll = internalAction({
  args: {},
  handler: async (ctx) => {
    // Called Monday morning — digest covers the week just finished (Mon–Sun).
    // weekStartDate = the Monday that just passed = today (since we run Monday).
    const today = new Date();
    const day = today.getUTCDay(); // 1 = Monday
    const diff = today.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setUTCDate(diff);
    monday.setUTCHours(0, 0, 0, 0);
    // Actually for the digest we want the PREVIOUS week
    const prevMonday = new Date(monday);
    prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
    const weekStartDate = prevMonday.toISOString().split("T")[0];

    const users = await ctx.runQuery(internal.emailInternal.getUsersForDigest, {
      weekStartDate,
    });

    for (const user of users) {
      try {
        await ctx.runAction(internal.email.sendWeeklyDigestToUser, {
          userId: user._id,
          weekStartDate,
        });
      } catch (err) {
        console.error(`Digest failed for ${user._id}:`, err);
      }
    }
  },
});

export const sendWeeklyRemindersToAll = internalAction({
  args: {},
  handler: async (ctx) => {
    // Called Sunday evening UTC — remind users who haven't submitted weekly report
    const today = new Date();
    // Monday of current week
    const day = today.getUTCDay();
    const diff = today.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setUTCDate(diff);
    const weekStartDate = monday.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    const users = await ctx.runQuery(internal.emailInternal.getUsersForReminder, {
      weekStartDate,
      date: todayStr,
    });

    for (const user of users) {
      try {
        await ctx.runAction(internal.email.sendWeeklyReminderToUser, {
          userId: user._id,
          date: todayStr,
        });
      } catch (err) {
        console.error(`Reminder failed for ${user._id}:`, err);
      }
    }
  },
});
