import { NextResponse, NextRequest } from 'next/server';

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute

// Security headers configuration
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' ${process.env.NODE_ENV === 'development' ? "'unsafe-inline' 'unsafe-eval'" : "'sha256-PLACEHOLDER'"} https://fonts.googleapis.com;
    style-src 'self' ${process.env.NODE_ENV === 'development' ? "'unsafe-inline'" : "'sha256-PLACEHOLDER'"} https://fonts.googleapis.com;
    img-src 'self' data: https: blob:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com wss://*.firebaseio.com https://*.firebaseio.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim()
};

// Clean up old rate limit entries
function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now - value.timestamp > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(key);
    }
  }
}

// Rate limiting function
function rateLimit(identifier: string): boolean {
  cleanupRateLimitMap();
  
  const now = Date.now();
  const userRateLimit = rateLimitMap.get(identifier);
  
  if (!userRateLimit) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now });
    return true;
  }
  
  if (now - userRateLimit.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now });
    return true;
  }
  
  if (userRateLimit.count >= MAX_REQUESTS) {
    return false;
  }
  
  userRateLimit.count++;
  return true;
}

export function middleware(request: NextRequest) {
  // Get client identifier (IP address or session)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
  const identifier = `${clientIp}-${request.nextUrl.pathname}`;
  
  // Apply rate limiting to API routes and authentication endpoints
  if (request.nextUrl.pathname.startsWith('/api/') || 
      request.nextUrl.pathname === '/login') {
    if (!rateLimit(identifier)) {
      return new NextResponse('Too Many Requests', { 
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString()
        }
      });
    }
  }
  
  // Create response with security headers
  const response = NextResponse.next();
  
  // Apply security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add cache headers for static assets
  if (request.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|ico|svg|webp)$/i)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
