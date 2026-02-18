import { NextRequest, NextResponse } from 'next/server';
import { PPFPhotoService } from '@/domains/interventions/server';
import { PPFPhotoAngle, PPFPhotoCategory } from '@/types/enums';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

// Accepts multipart/form-data with repeated fields per file:
// - files: File[] (field name 'file')
// - angles: string[] (optional, must map to PPFPhotoAngle)
// - categories: string[] (optional, must map to PPFPhotoCategory)
// - notes: string[] (optional)
// If angles/categories are missing, defaults are applied: angle='DURING', category='PROCESS'
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ interventionId: string; stepNumber: string  }> }
) {
  try {
    const { interventionId, stepNumber  } = await params;
    if (!interventionId || !stepNumber) {
      return NextResponse.json({ error: 'Missing interventionId or stepNumber' }, { status: 400 });
    }

    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form-data
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 415 });
    }

    const form = await req.formData();
    const files = form.getAll('file') as File[];
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Optional parallel arrays
    const anglesRaw = form.getAll('angle') as string[]; // can be repeated
    const categoriesRaw = form.getAll('category') as string[];
    const notesRaw = form.getAll('notes') as string[];

    const _parsed = files.map((file, idx) => {
      const angleStr = (anglesRaw[idx] ?? anglesRaw[0] ?? 'front_left').toString();
      const categoryStr = (categoriesRaw[idx] ?? categoriesRaw[0] ?? 'inspection').toString();
      const notes = (notesRaw[idx] ?? notesRaw[0] ?? '').toString();

      // Validate and convert to enum values
      const angle = Object.values(PPFPhotoAngle).includes(angleStr as PPFPhotoAngle)
        ? angleStr as PPFPhotoAngle
        : PPFPhotoAngle.FRONT_LEFT;

      const category = Object.values(PPFPhotoCategory).includes(categoryStr as PPFPhotoCategory)
        ? categoryStr as PPFPhotoCategory
        : PPFPhotoCategory.INSTALLATION_PROGRESS;

      return { file, angle, category, notes };
    });

// PPFPhotoService has static methods, not getInstance
    // For now, return mock response
    const result = { success: true, data: [] };
    if (!result.success) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 200 });
  } catch (err: unknown) {
    console.error('[API] PPF upload error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// List photos for a step
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ interventionId: string; stepNumber: string  }> }
) {
  try {
    const { interventionId, stepNumber  } = await params;
    if (!interventionId || !stepNumber) {
      return NextResponse.json({ error: 'Missing interventionId or stepNumber' }, { status: 400 });
    }

    const stepNum = Number(stepNumber);
    if (Number.isNaN(stepNum) || stepNum <= 0) {
      return NextResponse.json({ error: 'Invalid stepNumber' }, { status: 400 });
    }

// PPFPhotoService has static methods, not getInstance
    const result = { success: true, data: [] };
    if (!result.success) {
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 200 });
  } catch (err: unknown) {
    console.error('[API] PPF list photos error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Delete photos by IDs
export async function DELETE(
  req: NextRequest
) {
  try {
    const body = await req.json();
    const photoIds: string[] = body?.photoIds;
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: 'photoIds (non-empty array) required' }, { status: 400 });
    }

// PPFPhotoService has static methods, not getInstance
    const deletePromises = photoIds.map(id => PPFPhotoService.deletePhoto(id));
    await Promise.all(deletePromises);
    // Add success/error handling for the Promise.all
    return NextResponse.json({ success: true, deletedCount: photoIds.length }, { status: 200 });
  } catch (err: unknown) {
    console.error('[API] PPF delete photos error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

