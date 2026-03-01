import { prisma } from "@/lib/db";
import { sendEmail } from "./email";
import { sendSMS } from "./sms";
import { sendPush } from "./push";

export async function processNotifications() {
  const users = await prisma.user.findMany({
    include: {
      notifPrefs: true,
      deadlines: {
        where: {
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { gte: new Date() },
        },
        orderBy: { dueAt: "asc" },
      },
      pushSubs: true,
    },
  });

  for (const user of users) {
    if (!user.notifPrefs) continue;

    const prefs = user.notifPrefs;
    const now = Date.now();

    for (const deadline of user.deadlines) {
      const hoursUntilDue =
        (deadline.dueAt.getTime() - now) / (1000 * 60 * 60);

      // Standard reminder
      if (
        hoursUntilDue <= prefs.reminderHours &&
        hoursUntilDue > prefs.urgentHours
      ) {
        await sendNotification(user, deadline, "reminder", prefs);
      }

      // Urgent reminder
      if (hoursUntilDue <= prefs.urgentHours && hoursUntilDue > 0) {
        await sendNotification(user, deadline, "urgent", prefs);
      }
    }

    // Daily digest
    if (prefs.dailyDigest && prefs.emailEnabled && user.email) {
      await sendDailyDigest(user);
    }
  }
}

async function sendNotification(
  user: { id: string; email: string | null; phone: string | null; pushSubs: Array<{ endpoint: string; p256dh: string; auth: string }> },
  deadline: { id: string; title: string; dueAt: Date; courseName: string | null },
  type: string,
  prefs: { emailEnabled: boolean; smsEnabled: boolean; pushEnabled: boolean }
) {
  const channels: string[] = [];
  if (prefs.emailEnabled) channels.push("email");
  if (prefs.smsEnabled) channels.push("sms");
  if (prefs.pushEnabled) channels.push("push");

  for (const channel of channels) {
    // Dedup check
    const existing = await prisma.notificationLog.findUnique({
      where: {
        userId_deadlineId_channel_type: {
          userId: user.id,
          deadlineId: deadline.id,
          channel,
          type,
        },
      },
    });

    if (existing) continue;

    try {
      const message = formatMessage(deadline, type);

      if (channel === "email" && user.email) {
        await sendEmail(user.email, message.subject, message.body);
      } else if (channel === "sms" && user.phone) {
        await sendSMS(user.phone, message.body);
      } else if (channel === "push" && user.pushSubs.length > 0) {
        for (const sub of user.pushSubs) {
          await sendPush(sub, message.subject, message.body);
        }
      }

      // Log the notification
      await prisma.notificationLog.create({
        data: {
          userId: user.id,
          deadlineId: deadline.id,
          channel,
          type,
        },
      });
    } catch (err) {
      console.error(`Failed to send ${channel} ${type} notification:`, err);
    }
  }
}

async function sendDailyDigest(user: { id: string; email: string | null }) {
  if (!user.email) return;

  // Check if we already sent today's digest
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.notificationLog.findFirst({
    where: {
      userId: user.id,
      channel: "email",
      type: "digest",
      sentAt: { gte: today },
    },
  });

  if (existing) return;

  const deadlines = await prisma.deadline.findMany({
    where: {
      userId: user.id,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      dueAt: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { dueAt: "asc" },
  });

  if (deadlines.length === 0) return;

  const lines = deadlines.map((d) => {
    const date = d.dueAt.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return `- ${d.title} (${date})${d.courseName ? ` — ${d.courseName}` : ""}`;
  });

  const body = `Here are your upcoming deadlines this week:\n\n${lines.join("\n")}`;

  await sendEmail(user.email, "Your Weekly Deadline Digest", body);

  await prisma.notificationLog.create({
    data: {
      userId: user.id,
      deadlineId: deadlines[0].id,
      channel: "email",
      type: "digest",
    },
  });
}

function formatMessage(
  deadline: { title: string; dueAt: Date; courseName: string | null },
  type: string
) {
  const dateStr = deadline.dueAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const course = deadline.courseName ? ` (${deadline.courseName})` : "";

  if (type === "urgent") {
    return {
      subject: `URGENT: "${deadline.title}" is due soon!`,
      body: `"${deadline.title}"${course} is due ${dateStr}. Don't forget to submit!`,
    };
  }

  return {
    subject: `Reminder: "${deadline.title}" is coming up`,
    body: `"${deadline.title}"${course} is due ${dateStr}.`,
  };
}
