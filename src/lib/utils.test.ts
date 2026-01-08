import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  formatCurrency,
  parseCurrencyToCents,
  formatDate,
  formatDateTime,
  generateQuoteNumber,
  generateInlandQuoteNumber,
} from './utils'

describe('cn (class name merger)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', true && 'included', false && 'excluded')).toBe('base included')
  })

  it('merges tailwind classes correctly', () => {
    // twMerge should handle conflicting classes
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles arrays and objects', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
    expect(cn({ foo: true, bar: false })).toBe('foo')
  })

  it('handles empty and null values', () => {
    expect(cn('foo', null, undefined, 'bar')).toBe('foo bar')
    expect(cn()).toBe('')
  })
})

describe('formatCurrency', () => {
  it('formats cents as USD currency', () => {
    expect(formatCurrency(10000)).toBe('$100.00')
    expect(formatCurrency(12345)).toBe('$123.45')
    expect(formatCurrency(100)).toBe('$1.00')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('handles large values', () => {
    expect(formatCurrency(1000000)).toBe('$10,000.00')
    expect(formatCurrency(123456789)).toBe('$1,234,567.89')
  })

  it('handles decimal cents', () => {
    expect(formatCurrency(99)).toBe('$0.99')
    expect(formatCurrency(1)).toBe('$0.01')
  })
})

describe('parseCurrencyToCents', () => {
  it('parses plain numbers', () => {
    expect(parseCurrencyToCents('100')).toBe(10000)
    expect(parseCurrencyToCents('123.45')).toBe(12345)
  })

  it('handles currency symbols', () => {
    expect(parseCurrencyToCents('$100')).toBe(10000)
    expect(parseCurrencyToCents('$123.45')).toBe(12345)
  })

  it('handles commas', () => {
    expect(parseCurrencyToCents('1,000')).toBe(100000)
    expect(parseCurrencyToCents('$1,234.56')).toBe(123456)
  })

  it('rounds to nearest cent', () => {
    expect(parseCurrencyToCents('100.999')).toBe(10100)
    expect(parseCurrencyToCents('100.994')).toBe(10099)
  })

  it('handles empty and invalid input', () => {
    expect(parseCurrencyToCents('')).toBe(0)
    expect(parseCurrencyToCents('abc')).toBe(0)
  })
})

describe('formatDate', () => {
  it('formats date string', () => {
    // Use a Date object to avoid timezone issues with date-only strings
    const date = new Date(2026, 0, 7) // Jan 7, 2026 in local time
    const result = formatDate(date)
    expect(result).toMatch(/Jan 7, 2026/)
  })

  it('formats Date object', () => {
    const date = new Date(2026, 0, 7) // Jan 7, 2026
    const result = formatDate(date)
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2026/)
  })

  it('handles ISO string with time', () => {
    // Using T12:00:00Z ensures the date is the same regardless of timezone
    const result = formatDate('2026-06-15T12:00:00Z')
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/2026/)
  })
})

describe('formatDateTime', () => {
  it('includes time in output', () => {
    const result = formatDateTime('2026-01-07T14:30:00Z')
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2026/)
    // Should include time component
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })

  it('formats Date object with time', () => {
    const date = new Date(2026, 5, 15, 14, 30) // Jun 15, 2026 2:30 PM
    const result = formatDateTime(date)
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/2026/)
  })
})

describe('generateQuoteNumber', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 7)) // Jan 7, 2026
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('generates quote number with default prefix', () => {
    const quoteNumber = generateQuoteNumber()
    expect(quoteNumber).toMatch(/^QT-20260107-\d{4}$/)
  })

  it('generates quote number with custom prefix', () => {
    const quoteNumber = generateQuoteNumber('DQ')
    expect(quoteNumber).toMatch(/^DQ-20260107-\d{4}$/)
  })

  it('includes 4-digit random suffix', () => {
    const quoteNumber = generateQuoteNumber()
    const parts = quoteNumber.split('-')
    const suffix = parseInt(parts[2])
    expect(suffix).toBeGreaterThanOrEqual(1000)
    expect(suffix).toBeLessThan(10000)
  })

  it('generates different numbers on multiple calls', () => {
    const numbers = new Set<string>()
    for (let i = 0; i < 10; i++) {
      numbers.add(generateQuoteNumber())
    }
    // With random suffix, all 10 should be unique (statistically)
    expect(numbers.size).toBe(10)
  })
})

describe('generateInlandQuoteNumber', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 7)) // Jan 7, 2026
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('generates quote number with IQ prefix', () => {
    const quoteNumber = generateInlandQuoteNumber()
    expect(quoteNumber).toMatch(/^IQ-20260107-\d{4}$/)
  })
})
