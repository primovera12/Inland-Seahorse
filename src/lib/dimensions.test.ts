import { describe, it, expect } from 'vitest'
import {
  parseSmartDimension,
  inchesToFeetInches,
  formatDimension,
  formatDimensionDual,
  inchesToCm,
  inchesToMeters,
  cmToInches,
  metersToInches,
  formatDimensionInUnit,
  parseDimensionFromUnit,
  formatDimensionAllUnits,
  convertToInches,
  convertToLbs,
  formatWeight,
  isOversize,
  isOverweight,
} from './dimensions'
import { DEFAULT_DIMENSION_THRESHOLDS } from '@/types/settings'

describe('parseSmartDimension', () => {
  it('parses feet.inches format below threshold', () => {
    // 10.6 feet = 10 feet 6 inches = 126 inches
    expect(parseSmartDimension('10.6', 'length')).toBe(126)
    // 8.5 feet = 8 feet 5 inches = 101 inches
    expect(parseSmartDimension('8.5', 'height')).toBe(101)
    // 3.0 feet = 3 feet 0 inches = 36 inches
    expect(parseSmartDimension('3.0', 'width')).toBe(36)
  })

  it('treats values above threshold as plain inches', () => {
    // Default length threshold is 70, so 126 is treated as inches
    expect(parseSmartDimension('126', 'length')).toBe(126)
    expect(parseSmartDimension(126, 'length')).toBe(126)
  })

  it('handles numeric input', () => {
    expect(parseSmartDimension(10.6, 'length')).toBe(126)
    expect(parseSmartDimension(126, 'length')).toBe(126)
  })

  it('returns 0 for invalid input', () => {
    expect(parseSmartDimension('', 'length')).toBe(0)
    expect(parseSmartDimension('abc', 'length')).toBe(0)
    expect(parseSmartDimension(NaN, 'length')).toBe(0)
  })

  it('respects custom thresholds', () => {
    const customThresholds = {
      length_threshold: 100,
      width_threshold: 50,
      height_threshold: 50,
    }
    // 80 is below custom threshold of 100, so treat as feet.inches
    expect(parseSmartDimension(80.0, 'length', customThresholds)).toBe(960) // 80 feet = 960 inches
  })

  it('uses default thresholds when not provided', () => {
    // Verify default thresholds are used
    expect(parseSmartDimension(15.0, 'width')).toBe(180) // 15 feet = 180 inches (15 < 16 threshold)
    expect(parseSmartDimension(17.0, 'width')).toBe(17) // 17 > 16 threshold, treated as inches
  })
})

describe('inchesToFeetInches', () => {
  it('converts inches to feet and inches string', () => {
    expect(inchesToFeetInches(126)).toBe("10' 6\"")
    expect(inchesToFeetInches(12)).toBe("1' 0\"")
    expect(inchesToFeetInches(24)).toBe("2' 0\"")
    expect(inchesToFeetInches(37)).toBe("3' 1\"")
  })

  it('handles zero and negative values', () => {
    expect(inchesToFeetInches(0)).toBe("0' 0\"")
    expect(inchesToFeetInches(-5)).toBe("0' 0\"")
  })

  it('handles decimal values by rounding', () => {
    expect(inchesToFeetInches(126.7)).toBe("10' 7\"") // 126.7 % 12 = 6.7 rounds to 7
  })
})

describe('formatDimension', () => {
  it('formats inches as feet-inches', () => {
    expect(formatDimension(126)).toBe("10'-6\"")
    expect(formatDimension(12)).toBe("1'-0\"")
    expect(formatDimension(37)).toBe("3'-1\"")
  })

  it('returns dash for invalid values', () => {
    expect(formatDimension(0)).toBe('-')
    expect(formatDimension(-5)).toBe('-')
  })
})

describe('formatDimensionDual', () => {
  it('shows both inches and feet format', () => {
    expect(formatDimensionDual(126)).toBe("126\" (10'-6\")")
    expect(formatDimensionDual(12)).toBe("12\" (1'-0\")")
  })

  it('returns dash for invalid values', () => {
    expect(formatDimensionDual(0)).toBe('-')
    expect(formatDimensionDual(-5)).toBe('-')
  })
})

describe('unit conversions', () => {
  describe('inchesToCm', () => {
    it('converts inches to centimeters', () => {
      expect(inchesToCm(1)).toBe(2.5) // 2.54 rounded to 1 decimal
      expect(inchesToCm(12)).toBe(30.5) // 30.48 rounded
      expect(inchesToCm(100)).toBe(254)
    })
  })

  describe('inchesToMeters', () => {
    it('converts inches to meters', () => {
      expect(inchesToMeters(39.37)).toBeCloseTo(1, 1) // ~1 meter
      expect(inchesToMeters(100)).toBe(2.54)
    })
  })

  describe('cmToInches', () => {
    it('converts centimeters to inches', () => {
      expect(cmToInches(2.54)).toBe(1)
      expect(cmToInches(30.48)).toBe(12)
      expect(cmToInches(100)).toBe(39)
    })
  })

  describe('metersToInches', () => {
    it('converts meters to inches', () => {
      expect(metersToInches(1)).toBe(39) // 39.37 rounded
      expect(metersToInches(2.54)).toBe(100)
    })
  })
})

describe('formatDimensionInUnit', () => {
  it('formats in inches', () => {
    expect(formatDimensionInUnit(126, 'inches')).toBe('126"')
  })

  it('formats in feet', () => {
    expect(formatDimensionInUnit(126, 'ft-in')).toBe("10'-6\"")
  })

  it('formats in centimeters', () => {
    expect(formatDimensionInUnit(100, 'cm')).toBe('254 cm')
  })

  it('formats in meters', () => {
    expect(formatDimensionInUnit(100, 'meters')).toBe('2.54 m')
  })

  it('returns dash for invalid values', () => {
    expect(formatDimensionInUnit(0, 'inches')).toBe('-')
    expect(formatDimensionInUnit(-5, 'ft-in')).toBe('-')
  })
})

describe('parseDimensionFromUnit', () => {
  it('parses inches directly', () => {
    expect(parseDimensionFromUnit(126, 'inches')).toBe(126)
  })

  it('parses feet.inches format', () => {
    expect(parseDimensionFromUnit(10.6, 'ft-in')).toBe(126) // 10 feet 6 inches
    expect(parseDimensionFromUnit(5.0, 'ft-in')).toBe(60)
  })

  it('parses centimeters to inches', () => {
    expect(parseDimensionFromUnit(254, 'cm')).toBe(100)
  })

  it('parses meters to inches', () => {
    expect(parseDimensionFromUnit(2.54, 'meters')).toBe(100)
  })

  it('returns 0 for invalid values', () => {
    expect(parseDimensionFromUnit(0, 'inches')).toBe(0)
    expect(parseDimensionFromUnit(-5, 'ft-in')).toBe(0)
  })
})

describe('formatDimensionAllUnits', () => {
  it('returns all unit formats', () => {
    const result = formatDimensionAllUnits(126)
    expect(result.inches).toBe('126"')
    expect(result.feetInches).toBe("10'-6\"")
    expect(result.cm).toBe('320 cm')
    expect(result.meters).toBe('3.2 m')
  })

  it('returns dashes for invalid values', () => {
    const result = formatDimensionAllUnits(0)
    expect(result.inches).toBe('-')
    expect(result.feetInches).toBe('-')
    expect(result.cm).toBe('-')
    expect(result.meters).toBe('-')
  })
})

describe('convertToInches', () => {
  it('parses feet\'inches" format', () => {
    expect(convertToInches("10'6\"")).toBe(126)
    expect(convertToInches("10' 6\"")).toBe(126)
    expect(convertToInches("10'6")).toBe(126)
  })

  it('parses numeric strings as feet format', () => {
    // The first regex /(\d+)['\s]*(\d+)?[""]?/ matches numeric strings,
    // treating the first number as feet. This is the existing behavior.
    expect(convertToInches('10')).toBe(120)  // 10 feet = 120 inches
    expect(convertToInches('5')).toBe(60)    // 5 feet = 60 inches
  })

  it('returns 0 for empty input', () => {
    expect(convertToInches('')).toBe(0)
  })
})

describe('convertToLbs', () => {
  it('parses plain numbers', () => {
    expect(convertToLbs('5000')).toBe(5000)
    expect(convertToLbs('48000')).toBe(48000)
  })

  it('handles commas in numbers', () => {
    expect(convertToLbs('5,000')).toBe(5000)
    expect(convertToLbs('48,000')).toBe(48000)
  })

  it('handles "lbs" suffix', () => {
    expect(convertToLbs('5000 lbs')).toBe(5000)
    expect(convertToLbs('5,000lbs')).toBe(5000)
  })

  it('converts tons to pounds', () => {
    expect(convertToLbs('2.5 tons')).toBe(5000)
    expect(convertToLbs('1 ton')).toBe(2000)
    expect(convertToLbs('10tons')).toBe(20000)
  })

  it('returns 0 for empty input', () => {
    expect(convertToLbs('')).toBe(0)
  })
})

describe('formatWeight', () => {
  it('formats weight with commas and lbs suffix', () => {
    expect(formatWeight(5000)).toBe('5,000 lbs')
    expect(formatWeight(48000)).toBe('48,000 lbs')
    expect(formatWeight(150000)).toBe('150,000 lbs')
  })

  it('returns dash for invalid values', () => {
    expect(formatWeight(0)).toBe('-')
    expect(formatWeight(-5)).toBe('-')
  })
})

describe('isOversize', () => {
  const defaultLimits = { length: 636, width: 102, height: 162 }

  it('returns false when within legal limits', () => {
    expect(isOversize(600, 100, 150)).toBe(false)
    expect(isOversize(636, 102, 162)).toBe(false) // exactly at limit
  })

  it('returns true when length exceeds limit', () => {
    expect(isOversize(700, 100, 150)).toBe(true)
  })

  it('returns true when width exceeds limit', () => {
    expect(isOversize(600, 110, 150)).toBe(true)
  })

  it('returns true when height exceeds limit', () => {
    expect(isOversize(600, 100, 170)).toBe(true)
  })

  it('uses custom limits when provided', () => {
    const customLimits = { length: 500, width: 80, height: 120 }
    expect(isOversize(550, 70, 110, customLimits)).toBe(true) // length exceeds
    expect(isOversize(450, 70, 110, customLimits)).toBe(false)
  })
})

describe('isOverweight', () => {
  it('returns false when within legal limit', () => {
    expect(isOverweight(40000)).toBe(false)
    expect(isOverweight(48000)).toBe(false) // exactly at limit
  })

  it('returns true when exceeding legal limit', () => {
    expect(isOverweight(50000)).toBe(true)
    expect(isOverweight(150000)).toBe(true)
  })

  it('uses custom limit when provided', () => {
    expect(isOverweight(45000, 42000)).toBe(true)
    expect(isOverweight(40000, 42000)).toBe(false)
  })
})
