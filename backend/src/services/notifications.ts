import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface NotificationInput {
  userId: string;
  type: string;
  message: string;
}

export async function createNotification(input: NotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
    },
  });

  // Stub: In production, push to WebSocket or send email
  if (process.env.NODE_ENV === "production") {
    await sendEmail(input.userId, input.type, input.message);
  }

  return notification;
}

export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    throw new Error("Notification not found");
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

async function sendEmail(userId: string, type: string, message: string) {
  // Email sending stub
  // In production, integrate with SendGrid, AWS SES, or similar
  console.log(`[Email Stub] To: ${userId}, Type: ${type}, Message: ${message}`);
}
