import { NextRequest, NextResponse } from 'next/server';
import { generateUniqueTaskNumber, generateFallbackTaskNumber } from '@/lib/utils/task-number-generator';
import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger('TaskNumberAPI');

/**
 * Generate a unique random 7-digit task number
 * GET /api/tasks/generate-number
 */
export async function GET(): Promise<NextResponse> {
  try {
    logger.info('Task number generation requested');

    const supabase = await createClient();

    const result = await generateUniqueTaskNumber({
      maxRetries: 10
    }, supabase);

    if (result.success && result.taskNumber) {
      logger.info('Task number generated successfully', {
        taskNumber: result.taskNumber,
        attemptsUsed: result.attemptsUsed
      });

      return NextResponse.json({
        success: true,
        task_number: result.taskNumber,
        attempts_used: result.attemptsUsed,
        generated_at: new Date().toISOString()
      }, { status: 200 });
    }

    // Generation failed, use fallback
    logger.warn('Task number generation failed, using fallback', {
      error: result.error,
      attemptsUsed: result.attemptsUsed
    });

    const fallbackNumber = generateFallbackTaskNumber();

    return NextResponse.json({
      success: true,
      task_number: fallbackNumber,
      attempts_used: result.attemptsUsed,
      generated_at: new Date().toISOString(),
      fallback: true,
      warning: 'Used fallback generation due to: ' + result.error
    }, { status: 200 });

  } catch (error) {
    logger.error('Unhandled error in task number generation', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });

    // Ultimate fallback for complete failure
    try {
      const emergencyFallback = generateFallbackTaskNumber();

      return NextResponse.json({
        success: true,
        task_number: emergencyFallback,
        generated_at: new Date().toISOString(),
        fallback: true,
        error: 'Emergency fallback due to system error'
      }, { status: 200 });
    } catch {
      // If even the fallback fails, return error
      return NextResponse.json({
        success: false,
        error: 'Failed to generate task number',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }
}

/**
 * Validate a task number format
 * POST /api/tasks/generate-number with { "task_number": "1234567" }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { task_number } = body;

    if (!task_number || typeof task_number !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'task_number is required and must be a string'
      }, { status: 400 });
    }

    const { isValidTaskNumberFormat } = await import('@/lib/utils/task-number-generator');
    const isValid = isValidTaskNumberFormat(task_number);

    logger.debug('Task number validation requested', {
      taskNumber: task_number,
      isValid
    });

    return NextResponse.json({
      success: true,
      task_number,
      is_valid: isValid,
      format_requirements: '7 digits (1000000-9999999)',
      validated_at: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    logger.error('Error validating task number', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to validate task number',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
