import { NextResponse } from 'next/server';

const buildContentSecurityPolicy = (isDev: boolean) => {
  const scriptSrc = ["'self'", isDev ? "'unsafe-eval'" : ''].filter(Boolean).join(' ');
  const connectSrc = [
    "'self'",
    'tauri:',
    'ipc:',
    isDev ? 'http://localhost:*' : '',
    isDev ? 'ws://localhost:*' : '',
  ].filter(Boolean).join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
};

export function middleware() {
  const response = NextResponse.next();
  const isDev = process.env.NODE_ENV === 'development';

  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(isDev));
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=(), interest-cohort=()'
  );

  return response;
}

export const config = {
  matcher: [
    // Exclude Next.js static assets, images, and common file types from header injection.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff|woff2)$).*)',
  ],
};
