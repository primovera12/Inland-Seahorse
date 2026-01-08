import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, RATE_LIMITS } from './rate-limiter'

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Reset the internal store between tests by using unique identifiers
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkRateLimit', () => {
    it('should allow requests within the limit', () => {
      const identifier = `test-${Date.now()}`
      const config = { limit: 3, windowSeconds: 60 }

      const result1 = checkRateLimit(identifier, config)
      const result2 = checkRateLimit(identifier, config)
      const result3 = checkRateLimit(identifier, config)

      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(2)

      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(1)

      expect(result3.success).toBe(true)
      expect(result3.remaining).toBe(0)
    })

    it('should block requests exceeding the limit', () => {
      const identifier = `test-block-${Date.now()}`
      const config = { limit: 2, windowSeconds: 60 }

      checkRateLimit(identifier, config)
      checkRateLimit(identifier, config)
      const result = checkRateLimit(identifier, config)

      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reset after the window expires', () => {
      const identifier = `test-reset-${Date.now()}`
      const config = { limit: 1, windowSeconds: 60 }

      const result1 = checkRateLimit(identifier, config)
      expect(result1.success).toBe(true)

      // Second request should be blocked
      const result2 = checkRateLimit(identifier, config)
      expect(result2.success).toBe(false)

      // Advance time past the window
      vi.advanceTimersByTime(61000)

      // Should be allowed again
      const result3 = checkRateLimit(identifier, config)
      expect(result3.success).toBe(true)
    })

    it('should track different identifiers separately', () => {
      const user1 = `user1-${Date.now()}`
      const user2 = `user2-${Date.now()}`
      const config = { limit: 1, windowSeconds: 60 }

      const result1 = checkRateLimit(user1, config)
      const result2 = checkRateLimit(user2, config)

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })

    it('should return correct resetAt timestamp', () => {
      const identifier = `test-time-${Date.now()}`
      const config = { limit: 5, windowSeconds: 60 }

      const now = Date.now()
      const result = checkRateLimit(identifier, config)

      expect(result.resetAt).toBeGreaterThan(now)
      expect(result.resetAt).toBeLessThanOrEqual(now + 60000)
    })
  })

  describe('RATE_LIMITS presets', () => {
    it('should have correct auth limits', () => {
      expect(RATE_LIMITS.auth.limit).toBe(5)
      expect(RATE_LIMITS.auth.windowSeconds).toBe(60)
    })

    it('should have correct feedback limits', () => {
      expect(RATE_LIMITS.feedback.limit).toBe(5)
      expect(RATE_LIMITS.feedback.windowSeconds).toBe(300)
    })

    it('should have correct email limits', () => {
      expect(RATE_LIMITS.email.limit).toBe(10)
      expect(RATE_LIMITS.email.windowSeconds).toBe(60)
    })
  })
})
