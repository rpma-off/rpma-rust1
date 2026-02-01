import { NextResponse } from 'next/server';
import { createCSRFToken, getCSRFCookieOptions } from '@/lib/auth/csrf';
import { createLogger, LogContext } from '@/lib/logger';

const logger = createLogger('CSRFEndpoint');

export async function GET() {
  try {
    const token = await createCSRFToken();
    
    const response = NextResponse.json({ csrfToken: token });
    
    // Set the CSRF token in an HttpOnly cookie
    response.cookies.set('rpma_csrf', token, getCSRFCookieOptions());

    logger.info(LogContext.AUTH, 'CSRF token generated and sent.');
    
    return response;
  } catch (error) {
    logger.error(LogContext.AUTH, 'Failed to generate CSRF token', { error });
    return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 });
  }
}
