import { NextRequest, NextResponse } from 'next/server';
import { settingsService } from '@/lib/services/entities/settings.service';
import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';

// POST /api/settings/export - Export user data
export const POST = withAuth(async (request: NextRequestWithUser) => {
  const { user } = request;
  try {
    const data = await settingsService.exportUserData(user.id);

    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="user-data-${user.id}-${new Date().toISOString().split('T')[0]}.json"`);

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export data' },
      { status: 500 }
    );
  }
}, 'all');
