import { prisma } from "./prisma";
import { addDays } from "date-fns";

/**
 * Notification delivery layer.
 * In-app notifications are always stored in the DB.
 * sendWhatsApp / sendEmail are integration hooks — plug in Twilio / Meta API /
 * Resend / Nodemailer credentials via env vars to enable external delivery.
 */
async function sendWhatsApp(phone: string | null, message: string) {
  if (!phone || !process.env.WHATSAPP_API_TOKEN) return;
  // TODO: integrate WhatsApp Business API (e.g. Meta Cloud API or Twilio)
  console.log(`[whatsapp -> ${phone}] ${message}`);
}

async function sendEmail(email: string, subject: string, body: string) {
  if (!process.env.EMAIL_API_KEY) return;
  // TODO: integrate email provider (e.g. Resend, SendGrid, Nodemailer+SMTP)
  console.log(`[email -> ${email}] ${subject}: ${body}`);
}

export async function notify(
  userId: string,
  type: "UPCOMING" | "DUE" | "OVERDUE" | "PAYMENT_RECEIVED" | "INFO",
  title: string,
  message: string
) {
  const notif = await prisma.notification.create({
    data: { userId, type, title, message },
  });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    await sendWhatsApp(user.phone, `${title}\n${message}`);
    await sendEmail(user.email, title, message);
  }
  return notif;
}

/**
 * Scan all active sales and create due-soon / overdue notifications.
 * Designed to be called from the API (dashboard load) or a daily cron job.
 */
export async function scanAndNotify() {
  const now = new Date();
  const soon = addDays(now, 3);

  const upcoming = await prisma.installment.findMany({
    where: { status: { in: ["PENDING", "PARTIAL"] }, dueDate: { gte: now, lte: soon } },
    include: { sale: { include: { client: true, product: true } } },
  });
  const overdue = await prisma.installment.findMany({
    where: { status: "OVERDUE" },
    include: { sale: { include: { client: true, product: true } } },
  });

  for (const inst of upcoming) {
    const exists = await prisma.notification.findFirst({
      where: {
        userId: inst.sale.clientId,
        type: "UPCOMING",
        message: { contains: `installment #${inst.number}` },
        createdAt: { gte: addDays(now, -3) },
      },
    });
    if (!exists) {
      await notify(
        inst.sale.clientId,
        "UPCOMING",
        "Upcoming payment",
        `Your installment #${inst.number} of ${inst.amount} DZD for ${inst.sale.product.name} is due on ${inst.dueDate.toDateString()}.`
      );
    }
  }
  for (const inst of overdue) {
    const exists = await prisma.notification.findFirst({
      where: {
        userId: inst.sale.clientId,
        type: "OVERDUE",
        message: { contains: `installment #${inst.number}` },
        createdAt: { gte: addDays(now, -1) },
      },
    });
    if (!exists) {
      await notify(
        inst.sale.clientId,
        "OVERDUE",
        "Overdue payment",
        `Your installment #${inst.number} of ${inst.amount} DZD for ${inst.sale.product.name} was due on ${inst.dueDate.toDateString()} and is now overdue.`
      );
    }
  }
}
