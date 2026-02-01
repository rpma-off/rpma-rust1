 import { NextRequest, NextResponse } from 'next/server';
 import { clientService } from '@/lib/services/entities/client.service';
 import { getErrorMessage } from '@/types/api';

 export const dynamic = 'force-dynamic';

/**
 * GET /api/clients/search
 * Search clients by name, email, or company
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

     const result = await clientService.searchClients(query);

     if (!result.success) {
       return NextResponse.json(
         { error: getErrorMessage(result.error) },
         { status: 400 }
       );
     }

     return NextResponse.json(result.data);

  } catch (error) {
    console.error('Error searching clients:', error);
    return NextResponse.json(
      { error: 'Failed to search clients' },
      { status: 500 }
    );
  }
}
