 import { NextRequest, NextResponse } from 'next/server';
 import { TechnicianService, Technician } from '@/lib/services/entities/technician.service';

 export const dynamic = 'force-dynamic';

/**
 * GET /api/technicians - Get list of technicians for task assignment
 * Accessible by all authenticated users (technician, manager, admin)
 * Note: Authentication is handled by Tauri backend, not API middleware
 */
export const GET = async (request: NextRequest) => {
  try {
    const technicians = await TechnicianService.getTechnicians();

    // Transform to simple format for frontend
    const formattedTechnicians = technicians.map((tech: Technician) => ({
      id: tech.id,
      user_id: tech.userId,
      name: tech.name,
      email: tech.email,
      role: 'technician' // assuming role is technician
    }));

    return NextResponse.json(formattedTechnicians, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=300' }, // Cache for 5 minutes
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/technicians:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
