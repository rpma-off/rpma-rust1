  import { NextResponse } from 'next/server';
  import { settingsService } from '@/lib/services/entities/settings.service';
  import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';
  import { UpdateAccessibilityRequest } from '@/types/settings.types';

  export const dynamic = 'force-dynamic';

  // GET /api/settings/accessibility - Get accessibility settings
  export const GET = withAuth(async (request: NextRequestWithUser) => {
    const { user, token } = request;
   try {
     const result = await settingsService.getUserSettings(user.id, token);
     if (!result.success) {
       return NextResponse.json(
         { error: result.error || 'Failed to get settings' },
         { status: 500 }
       );
     }
     return NextResponse.json({ accessibility: result.data?.accessibility });
   } catch (error) {
     console.error('Error in GET /api/settings/accessibility:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
 }, 'all');

  // PUT /api/settings/accessibility - Update accessibility settings
  export const PUT = withAuth(async (request: NextRequestWithUser) => {
    const user = request.user;
   try {
     const body: UpdateAccessibilityRequest = await request.json();

     const result = await settingsService.updateAccessibility(user.id, body);

     if (!result.success) {
       return NextResponse.json(
         { error: result.error || 'Failed to update settings' },
         { status: 500 }
       );
     }

     return NextResponse.json({
       message: 'Accessibility settings updated successfully'
     });
   } catch (error) {
     console.error('Error in PUT /api/settings/accessibility:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
 }, 'all');
