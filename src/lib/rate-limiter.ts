/**
 * Simple in-memory rate limiter for API endpoints
 * For production at scale, consider using Redis-based solutions like @upstash/ratelimit
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Store rate limit entries by identifier (user ID or IP)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let cleanupTimer: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
  // Don't keep the process alive just for cleanup
  cleanupTimer.unref()
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for the requester (user ID, IP, etc.)
 * @param config - Rate limit configuration
 * @returns Result indicating if request is allowed
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  startCleanup()

  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const key = `${identifier}:${config.limit}:${config.windowSeconds}`

  let entry = rateLimitStore.get(key)

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    }
    rateLimitStore.set(key, entry)
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt: entry.resetAt,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  }
}

// Preset configurations for different endpoint types
export const RATE_LIMITS = {
  // Strict limits for sensitive operations
  auth: { limit: 5, windowSeconds: 60 },        // 5 requests per minute
  passwordReset: { limit: 3, windowSeconds: 300 }, // 3 requests per 5 minutes

  // Moderate limits for write operations
  create: { limit: 30, windowSeconds: 60 },      // 30 creates per minute
  update: { limit: 60, windowSeconds: 60 },      // 60 updates per minute
  delete: { limit: 20, windowSeconds: 60 },      // 20 deletes per minute

  // Higher limits for read operations
  read: { limit: 100, windowSeconds: 60 },       // 100 reads per minute

  // Email/notification limits
  email: { limit: 10, windowSeconds: 60 },       // 10 emails per minute

  // Feedback/ticket submission
  feedback: { limit: 5, windowSeconds: 300 },    // 5 submissions per 5 minutes

  // Public quote endpoints (no auth required, stricter limits)
  publicQuoteRead: { limit: 30, windowSeconds: 60 },  // 30 reads per minute
  publicQuoteAction: { limit: 5, windowSeconds: 60 }, // 5 accept/reject per minute
} as const
