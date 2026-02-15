import { NextResponse } from 'next/server';
import { notificationService, SendNotificationRequest, NotificationConfig } from '@/lib/services/notifications.service';
import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';

export const POST = withAuth(async (request: NextRequestWithUser) => {
  const { token } = request;
  try {
    const body = await request.json();

    if (body.action === 'initialize') {
      const config: NotificationConfig = body.config;
      await notificationService.initializeNotificationService(config, token);
      return NextResponse.json({ success: true, message: 'Notification service initialized' });
    }

    if (body.action === 'send') {
      const notificationRequest: SendNotificationRequest = body.request;
      await notificationService.sendNotification(notificationRequest, token);
      return NextResponse.json({ success: true, message: 'Notification sent' });
    }

    if (body.action === 'test') {
      const { recipient, channel } = body;
      const result = await notificationService.testNotificationConfig(recipient, channel, token);
      return NextResponse.json({ success: true, message: result });
    }

    if (body.action === 'status') {
      const status = await notificationService.getNotificationStatus(token);
      return NextResponse.json({ success: true, data: status });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
