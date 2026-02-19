 import { NextResponse } from 'next/server';
 import { configurationService } from '@/domains/admin/server';
 import { withAuth } from '@/lib/middleware/auth.middleware';

 export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/configuration/business-hours
 * Get business hours configuration
 */
export const GET = withAuth(async () => {
  const response = await configurationService.getBusinessHoursConfig();

  if (response.error) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    );
  }

  return NextResponse.json(response.data);
}, 'admin');

/**
 * PUT /api/admin/configuration/business-hours
 * Update business hours configuration
 */
export const PUT = withAuth(async (request) => {
  try {
    const body = await request.json();
    const response = await configurationService.updateBusinessHoursConfig(body);

    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: 'Business hours configuration updated successfully' });
  } catch (error) {
    console.error('Error in PUT /api/admin/configuration/business-hours:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'admin');

