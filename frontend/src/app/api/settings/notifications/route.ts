  import { NextRequest, NextResponse } from 'next/server';
  import { settingsService } from '@/lib/services/entities/settings.service';
  import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';

  export const dynamic = 'force-dynamic';

  // GET /api/settings/notifications - Get notification settings
  export const GET = withAuth(async (request: NextRequestWithUser, context: unknown) => {
    const { user, token } = request;
   try {
     const result = await settingsService.getUserSettings(user.id, token);
     if (!result.success) {
       return NextResponse.json(
         { error: result.error || 'Failed to get settings' },
         { status: 500 }
       );
     }
     return NextResponse.json({ notifications: result.data?.notifications });
   } catch (error) {
     return NextResponse.json(
       { error: error instanceof Error ? error.message : 'Failed to get notifications' },
       { status: 500 }
     );
   }
 }, 'all');

  // PUT /api/settings/notifications - Update notification settings
  export const PUT = withAuth(async (request: NextRequestWithUser, context: unknown) => {
    const { user, token } = request;
   try {
     const body = await request.json();

     const result = await settingsService.updateNotifications(user.id, body, token);

     if (!result.success) {
       return NextResponse.json(
         { error: result.error || 'Failed to update settings' },
         { status: 500 }
       );
     }

     return NextResponse.json({
       message: 'Notification settings updated successfully',
       notifications: result.data?.notifications
     });
   } catch (error) {
     console.error('Error in PUT /api/settings/notifications:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
 }, 'all');
