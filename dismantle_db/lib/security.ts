// =============================================
// SECURITY UTILITIES
// Input Validation, Sanitization, XSS Prevention
// =============================================

/**
 * Sanitize string input to prevent XSS attacks
 * Escapes HTML special characters
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

/**
 * Sanitize string but allow basic formatting (for display purposes)
 * Less strict than sanitizeString
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
}

/**
 * Validate and sanitize email address
 */
export function validateEmail(email: string | null | undefined): { valid: boolean; sanitized: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, sanitized: '' }
  }

  const sanitized = email.trim().toLowerCase()

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  const valid = emailRegex.test(sanitized) && sanitized.length <= 254

  return { valid, sanitized: valid ? sanitized : '' }
}

/**
 * Validate and sanitize phone number
 */
export function validatePhone(phone: string | null | undefined): { valid: boolean; sanitized: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, sanitized: '' }
  }

  // Remove all non-digit characters except + for country code
  const sanitized = phone.replace(/[^\d+\-\s()]/g, '').trim()

  // Check if it has a reasonable number of digits (7-15)
  const digitsOnly = sanitized.replace(/\D/g, '')
  const valid = digitsOnly.length >= 7 && digitsOnly.length <= 15

  return { valid, sanitized: valid ? sanitized : '' }
}

/**
 * Validate and sanitize URL
 */
export function validateUrl(url: string | null | undefined): { valid: boolean; sanitized: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, sanitized: '' }
  }

  const sanitized = url.trim()

  // Only allow http and https protocols
  try {
    const parsed = new URL(sanitized)
    const valid = ['http:', 'https:'].includes(parsed.protocol)
    return { valid, sanitized: valid ? sanitized : '' }
  } catch {
    // Try adding https:// prefix
    try {
      const withProtocol = `https://${sanitized}`
      const parsed = new URL(withProtocol)
      const valid = ['http:', 'https:'].includes(parsed.protocol)
      return { valid, sanitized: valid ? withProtocol : '' }
    } catch {
      return { valid: false, sanitized: '' }
    }
  }
}

/**
 * Validate numeric input
 */
export function validateNumber(
  input: string | number | null | undefined,
  options: { min?: number; max?: number; allowNegative?: boolean; allowDecimal?: boolean } = {}
): { valid: boolean; value: number | null } {
  const { min, max, allowNegative = false, allowDecimal = true } = options

  if (input === null || input === undefined || input === '') {
    return { valid: true, value: null } // Null is valid (optional field)
  }

  const num = typeof input === 'number' ? input : parseFloat(String(input))

  if (isNaN(num)) {
    return { valid: false, value: null }
  }

  if (!allowNegative && num < 0) {
    return { valid: false, value: null }
  }

  if (!allowDecimal && !Number.isInteger(num)) {
    return { valid: false, value: null }
  }

  if (min !== undefined && num < min) {
    return { valid: false, value: null }
  }

  if (max !== undefined && num > max) {
    return { valid: false, value: null }
  }

  return { valid: true, value: num }
}

/**
 * Validate string length
 */
export function validateLength(
  input: string | null | undefined,
  options: { min?: number; max?: number } = {}
): { valid: boolean; sanitized: string } {
  const { min = 0, max = 10000 } = options

  if (!input || typeof input !== 'string') {
    return { valid: min === 0, sanitized: '' }
  }

  const sanitized = input.trim()
  const valid = sanitized.length >= min && sanitized.length <= max

  return { valid, sanitized }
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string | null | undefined): string {
  if (!filename || typeof filename !== 'string') {
    return ''
  }

  return filename
    .replace(/\.\./g, '')           // Remove path traversal
    .replace(/[<>:"/\\|?*]/g, '')   // Remove invalid characters
    .replace(/[\x00-\x1f]/g, '')    // Remove control characters
    .trim()
    .slice(0, 255)                  // Limit length
}

/**
 * Validate hex color
 */
export function validateHexColor(color: string | null | undefined): { valid: boolean; sanitized: string } {
  if (!color || typeof color !== 'string') {
    return { valid: false, sanitized: '' }
  }

  const sanitized = color.trim()
  const hexRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

  if (!hexRegex.test(sanitized)) {
    return { valid: false, sanitized: '' }
  }

  // Ensure it starts with #
  const normalized = sanitized.startsWith('#') ? sanitized : `#${sanitized}`

  return { valid: true, sanitized: normalized }
}

/**
 * Check for potential SQL injection patterns
 * Note: This is a secondary defense - always use parameterized queries!
 */
export function hasSqlInjectionPatterns(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false
  }

  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,      // OR 1=1, AND 1=1
    /(--|\#|\/\*)/,                         // SQL comments
    /(\bEXEC\b|\bEXECUTE\b)/i,
    /(\bxp_\w+)/i,                          // SQL Server extended procedures
    /(;\s*(SELECT|INSERT|UPDATE|DELETE))/i, // Chained queries
  ]

  return patterns.some(pattern => pattern.test(input))
}

/**
 * Check for potential XSS patterns
 */
export function hasXssPatterns(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false
  }

  const patterns = [
    /<script\b/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /javascript:/i,
    /on\w+\s*=/i,              // Event handlers like onclick=
    /expression\s*\(/i,        // CSS expression
    /<svg[^>]*onload/i,
    /<img[^>]*onerror/i,
  ]

  return patterns.some(pattern => pattern.test(input))
}

/**
 * Comprehensive input validation for form data
 */
export function validateFormData<T extends Record<string, unknown>>(
  data: T,
  schema: Record<keyof T, {
    type: 'string' | 'number' | 'email' | 'phone' | 'url' | 'color' | 'boolean'
    required?: boolean
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
  }>
): { valid: boolean; errors: Record<string, string>; sanitized: Partial<T> } {
  const errors: Record<string, string> = {}
  const sanitized: Partial<T> = {}

  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key as keyof T]

    // Check required
    if (rules.required && (value === null || value === undefined || value === '')) {
      errors[key] = `${key} is required`
      continue
    }

    // Skip validation if empty and not required
    if (value === null || value === undefined || value === '') {
      continue
    }

    switch (rules.type) {
      case 'string': {
        const { valid, sanitized: sanitizedValue } = validateLength(
          String(value),
          { min: rules.minLength, max: rules.maxLength }
        )
        if (!valid) {
          errors[key] = `${key} must be between ${rules.minLength || 0} and ${rules.maxLength || 10000} characters`
        } else if (hasXssPatterns(sanitizedValue) || hasSqlInjectionPatterns(sanitizedValue)) {
          errors[key] = `${key} contains invalid characters`
        } else {
          (sanitized as Record<string, unknown>)[key] = sanitizeText(sanitizedValue)
        }
        break
      }

      case 'number': {
        const { valid, value: numValue } = validateNumber(value as string | number | null | undefined, { min: rules.min, max: rules.max })
        if (!valid) {
          errors[key] = `${key} must be a valid number${rules.min !== undefined ? ` >= ${rules.min}` : ''}${rules.max !== undefined ? ` <= ${rules.max}` : ''}`
        } else {
          (sanitized as Record<string, unknown>)[key] = numValue
        }
        break
      }

      case 'email': {
        const { valid, sanitized: sanitizedEmail } = validateEmail(String(value))
        if (!valid) {
          errors[key] = `${key} must be a valid email address`
        } else {
          (sanitized as Record<string, unknown>)[key] = sanitizedEmail
        }
        break
      }

      case 'phone': {
        const { valid, sanitized: sanitizedPhone } = validatePhone(String(value))
        if (!valid) {
          errors[key] = `${key} must be a valid phone number`
        } else {
          (sanitized as Record<string, unknown>)[key] = sanitizedPhone
        }
        break
      }

      case 'url': {
        const { valid, sanitized: sanitizedUrl } = validateUrl(String(value))
        if (!valid) {
          errors[key] = `${key} must be a valid URL`
        } else {
          (sanitized as Record<string, unknown>)[key] = sanitizedUrl
        }
        break
      }

      case 'color': {
        const { valid, sanitized: sanitizedColor } = validateHexColor(String(value))
        if (!valid) {
          errors[key] = `${key} must be a valid hex color`
        } else {
          (sanitized as Record<string, unknown>)[key] = sanitizedColor
        }
        break
      }

      case 'boolean': {
        (sanitized as Record<string, unknown>)[key] = Boolean(value)
        break
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized
  }
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Rate limit helper for client-side
 */
export function createRateLimiter(maxCalls: number, windowMs: number) {
  const calls: number[] = []

  return {
    canProceed: (): boolean => {
      const now = Date.now()
      // Remove old calls outside the window
      while (calls.length > 0 && calls[0] < now - windowMs) {
        calls.shift()
      }

      if (calls.length >= maxCalls) {
        return false
      }

      calls.push(now)
      return true
    },
    reset: () => {
      calls.length = 0
    }
  }
}
