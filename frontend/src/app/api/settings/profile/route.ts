  import { NextRequest, NextResponse } from 'next/server';
  import { settingsService } from '@/lib/services/entities/settings.service';
  import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';

  export const dynamic = 'force-dynamic';

 // GET /api/settings/profile - Get user profile
 export const GET = withAuth(async (request: NextRequestWithUser, context: unknown) => {
   const user = request.user;
  try {
    // Profile data might come from user auth or separate service
    // For now, return basic user info
    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get profile' },
      { status: 500 }
    );
  }
}, 'all');

 // PUT /api/settings/profile - Update user profile
 export const PUT = withAuth(async (request: NextRequestWithUser, context: unknown) => {
   const user = request.user;
  try {
    const body = await request.json();

    await settingsService.updateProfile(user.id, body);

    return NextResponse.json({
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error in PUT /api/settings/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'all');
