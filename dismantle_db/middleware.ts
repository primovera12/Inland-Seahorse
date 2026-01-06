import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// =============================================
// SECURITY MIDDLEWARE
// Rate Limiting, Bot Protection, Security Headers
// =============================================

// In-memory rate limit store (for serverless, consider using Redis/Upstash)
const rateLimitStore = new Map<string, { count: number; timestamp: number; blocked: boolean }>()

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,        // 1 minute window
  maxRequests: 100,           // Max requests per window
  maxApiRequests: 30,         // Stricter limit for API routes
  blockDuration: 5 * 60 * 1000, // Block for 5 minutes if exceeded
}

// Suspicious patterns that indicate bot/attack behavior
const SUSPICIOUS_PATTERNS = [
  /\.(php|asp|aspx|jsp|cgi)$/i,  // Common attack file extensions
  /wp-admin|wp-login|xmlrpc/i,    // WordPress attack attempts
  /\.\.\/|\.\.%2f/i,              // Path traversal attempts
  /<script|javascript:/i,          // XSS attempts in URL
  /union.*select|select.*from/i,  // SQL injection attempts
  /etc\/passwd|\/bin\/bash/i,     // File inclusion attempts
]

// Clean up old entries periodically (prevent memory leak)
function cleanupRateLimitStore() {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.timestamp > RATE_LIMIT_CONFIG.blockDuration) {
      rateLimitStore.delete(key)
    }
  }
}

// Get client identifier (IP + User Agent hash for better accuracy)
function getClientId(request: NextRequest): string {
  const ip = request.ip ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  // Add user agent to help distinguish clients behind same IP
  const userAgent = request.headers.get('user-agent') ?? ''
  const uaHash = userAgent.slice(0, 50) // Simple truncation for uniqueness

  return `${ip}-${uaHash.length}`
}

// Check for suspicious request patterns
function isSuspiciousRequest(request: NextRequest): boolean {
  const url = request.url
  const path = request.nextUrl.pathname

  // Check URL against suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(url) || pattern.test(path)) {
      return true
    }
  }

  // Check for unusually long URLs (potential buffer overflow attempt)
  if (url.length > 2048) {
    return true
  }

  // Check for missing or suspicious user agent
  const userAgent = request.headers.get('user-agent')
  if (!userAgent || userAgent.length < 10) {
    return true
  }

  // Check for common bot user agents (block malicious ones)
  const maliciousBots = /sqlmap|nikto|nmap|masscan|zgrab|nuclei|gobuster|dirb|wfuzz/i
  if (maliciousBots.test(userAgent)) {
    return true
  }

  return false
}

// Apply rate limiting
function applyRateLimit(clientId: string, isApiRoute: boolean): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const maxRequests = isApiRoute ? RATE_LIMIT_CONFIG.maxApiRequests : RATE_LIMIT_CONFIG.maxRequests

  // Clean up periodically (every 100 requests)
  if (rateLimitStore.size > 1000) {
    cleanupRateLimitStore()
  }

  const record = rateLimitStore.get(clientId)

  // Check if client is blocked
  if (record?.blocked && now - record.timestamp < RATE_LIMIT_CONFIG.blockDuration) {
    return { allowed: false, remaining: 0 }
  }

  // Check if within current window
  if (record && now - record.timestamp < RATE_LIMIT_CONFIG.windowMs) {
    if (record.count >= maxRequests) {
      // Block the client
      rateLimitStore.set(clientId, { ...record, blocked: true, timestamp: now })
      return { allowed: false, remaining: 0 }
    }
    record.count++
    return { allowed: true, remaining: maxRequests - record.count }
  }

  // Start new window
  rateLimitStore.set(clientId, { count: 1, timestamp: now, blocked: false })
  return { allowed: true, remaining: maxRequests - 1 }
}

// Security headers
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Enable XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy (restrict browser features)
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Content Security Policy (adjust as needed for your app)
  response.headers.set('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com; " +
    "frame-src 'self' blob:; " +
    "frame-ancestors 'none';"
  )

  // Strict Transport Security (HTTPS only)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  return response
}

export function middleware(request: NextRequest) {
  const clientId = getClientId(request)
  const path = request.nextUrl.pathname
  const isApiRoute = path.startsWith('/api')

  // Skip rate limiting for static assets
  if (path.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2)$/)) {
    return NextResponse.next()
  }

  // Check for suspicious requests first
  if (isSuspiciousRequest(request)) {
    console.warn(`Blocked suspicious request from ${clientId}: ${path}`)
    return new NextResponse('Forbidden', {
      status: 403,
      headers: { 'X-Blocked-Reason': 'Suspicious request pattern' }
    })
  }

  // Apply rate limiting
  const { allowed, remaining } = applyRateLimit(clientId, isApiRoute)

  if (!allowed) {
    console.warn(`Rate limited client: ${clientId}`)
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '300',
        'X-RateLimit-Remaining': '0'
      }
    })
  }

  // Continue with request and add security headers
  const response = NextResponse.next()

  // Add rate limit headers
  response.headers.set('X-RateLimit-Remaining', remaining.toString())

  // Add security headers
  return addSecurityHeaders(response)
}

// Configure which routes the middleware applies to
export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
