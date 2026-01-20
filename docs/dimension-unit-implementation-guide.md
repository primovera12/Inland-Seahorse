# Dimension & Unit Implementation Guide

This document outlines the changes made to implement ft-in dimension format with smart detection, unit selection for cargo items, and automatic conversion display. Use this as a reference for implementing the same functionality in the **Inland Transport Form** (dismantle quote's inland tab).

---

## 1. Core Utility Functions (`src/lib/dimensions.ts`)

### New Types Added

```typescript
export type DimensionUnit = 'inches' | 'ft-in' | 'cm' | 'mm' | 'meters'
export type WeightUnit = 'lbs' | 'kg' | 'ton'
```

### New Conversion Functions Added

```typescript
// Millimeters to inches
export function mmToInches(mm: number): number {
  return Math.round(mm / 25.4)
}

// Inches to millimeters
export function inchesToMm(inches: number): number {
  return Math.round(inches * 25.4)
}

// Kilograms to pounds
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462)
}

// Pounds to kilograms
export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462)
}

// Tons to pounds (1 ton = 2000 lbs)
export function tonToLbs(ton: number): number {
  return Math.round(ton * 2000)
}

// Pounds to tons
export function lbsToTon(lbs: number): number {
  return Math.round((lbs / 2000) * 100) / 100 // 2 decimal places
}
```

### Universal Conversion Functions

```typescript
// Parse dimension from any unit to inches (internal storage format)
export function parseDimensionToInches(value: number | string, unit: DimensionUnit): number {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (!numValue || isNaN(numValue) || numValue <= 0) return 0

  switch (unit) {
    case 'inches':
      return Math.round(numValue)
    case 'ft-in':
      return ftInInputToInches(String(value))
    case 'cm':
      return cmToInches(numValue)
    case 'mm':
      return mmToInches(numValue)
    case 'meters':
      return metersToInches(numValue)
    default:
      return Math.round(numValue)
  }
}

// Parse weight from any unit to pounds (internal storage format)
export function parseWeightToLbs(value: number | string, unit: WeightUnit): number {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (!numValue || isNaN(numValue) || numValue <= 0) return 0

  switch (unit) {
    case 'lbs':
      return Math.round(numValue)
    case 'kg':
      return kgToLbs(numValue)
    case 'ton':
      return tonToLbs(numValue)
    default:
      return Math.round(numValue)
  }
}
```

### Existing Functions Used

```typescript
// Convert inches to ft-in display format
export function inchesToFtInInput(inches: number): string
// Example: 364 → "30-4" (30 feet 4 inches)

// Parse ft-in input to inches with smart detection
export function ftInInputToInches(value: string): number
// Accepts: "30-4", "30.4", "30 4", "30'4", or just "364" (plain inches)
// Smart detection: values > 70 treated as plain inches

// Format inches to display string
export function formatDimension(inches: number): string
// Example: 126 → "10'-6""
```

---

## 2. Equipment Block Card Implementation (`equipment-block-card.tsx`)

### Approach: ft-in Format with Smart Detection

The equipment block card uses ft-in as the default input format with smart detection on blur.

### Key Implementation Details

#### State for Input Values
```typescript
const [dimensionInputs, setDimensionInputs] = useState({
  length: inchesToFtInInput(block.length_inches || 0),
  width: inchesToFtInInput(block.width_inches || 0),
  height: inchesToFtInInput(block.height_inches || 0),
  weight: String(block.weight_lbs || ''),
})
```

#### Blur Handler with Smart Detection
```typescript
const handleDimensionBlur = useCallback((field: 'length' | 'width' | 'height') => {
  const inputValue = dimensionInputs[field]

  // Smart conversion: parse input and normalize to ft-in format
  const inches = ftInInputToInches(inputValue)

  // Update display to normalized ft-in format
  setDimensionInputs(prev => ({
    ...prev,
    [field]: inchesToFtInInput(inches)
  }))

  // Save to database (auto-save)
  // ... mutation call with inches value
}, [dimensionInputs, /* other deps */])
```

#### Input Field UI
```tsx
<Input
  value={dimensionInputs.length}
  onChange={(e) => setDimensionInputs(prev => ({ ...prev, length: e.target.value }))}
  onBlur={() => handleDimensionBlur('length')}
  placeholder="ft-in (e.g., 30-4)"
/>
```

#### Display Helper Text
Show the converted inches value below the input:
```tsx
{dimensionInputs.length && (
  <span className="text-xs text-muted-foreground">
    = {ftInInputToInches(dimensionInputs.length)}"
  </span>
)}
```

---

## 3. Cargo Item Card Implementation (`cargo-item-card.tsx`)

### Approach: Unit Selection with Conversion Display

The cargo item card allows users to select their preferred unit and shows the converted value.

### Unit Options

```typescript
const DIMENSION_UNITS: { value: DimensionUnit; label: string }[] = [
  { value: 'ft-in', label: 'ft-in' },
  { value: 'inches', label: 'in' },
  { value: 'cm', label: 'cm' },
  { value: 'mm', label: 'mm' },
  { value: 'meters', label: 'm' },
]

const WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
  { value: 'lbs', label: 'lbs' },
  { value: 'kg', label: 'kg' },
  { value: 'ton', label: 'ton' },
]
```

### State Management

```typescript
// Track selected units per cargo item
const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>('ft-in')
const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs')
```

### Input with Unit Selector UI

```tsx
<div className="flex gap-2">
  <Input
    type="text"
    value={item.length}
    onChange={(e) => handleChange('length', e.target.value)}
    placeholder="Length"
    className="flex-1"
  />
  <Select value={dimensionUnit} onValueChange={setDimensionUnit}>
    <SelectTrigger className="w-20">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {DIMENSION_UNITS.map((unit) => (
        <SelectItem key={unit.value} value={unit.value}>
          {unit.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### Conversion Display

Show the internal storage value (inches/lbs) and ft-in format:

```tsx
{item.length && (
  <div className="text-xs text-muted-foreground mt-1">
    = {parseDimensionToInches(item.length, dimensionUnit)}"
    ({formatDimension(parseDimensionToInches(item.length, dimensionUnit))})
  </div>
)}

{item.weight && (
  <div className="text-xs text-muted-foreground mt-1">
    = {parseWeightToLbs(item.weight, weightUnit).toLocaleString()} lbs
  </div>
)}
```

### Truck Recommendation (Reactive)

The truck recommendation uses **converted values** (inches and lbs) and is reactive:

```typescript
const recommendedTruck = useMemo(() => {
  // Convert all cargo items to internal units
  const convertedItems = cargoItems.map(item => ({
    length_inches: parseDimensionToInches(item.length, dimensionUnit),
    width_inches: parseDimensionToInches(item.width, dimensionUnit),
    height_inches: parseDimensionToInches(item.height, dimensionUnit),
    weight_lbs: parseWeightToLbs(item.weight, weightUnit),
  }))

  // Calculate max dimensions and total weight
  const maxLength = Math.max(...convertedItems.map(i => i.length_inches))
  const maxWidth = Math.max(...convertedItems.map(i => i.width_inches))
  const maxHeight = Math.max(...convertedItems.map(i => i.height_inches))
  const totalWeight = convertedItems.reduce((sum, i) => sum + i.weight_lbs, 0)

  // Return appropriate truck based on dimensions and weight
  return calculateTruckRecommendation(maxLength, maxWidth, maxHeight, totalWeight)
}, [cargoItems, dimensionUnit, weightUnit])
```

---

## 4. Implementation Plan for Inland Transport Form

### Current State of `inland-transport-form.tsx`

The form currently has:
- **Old dimension units**: `'feet' | 'inches' | 'cm' | 'meters'` (missing 'mm', using 'feet' instead of 'ft-in')
- **Old weight units**: `'lbs' | 'kg'` (missing 'ton')
- CargoItem interface with dimension fields
- Truck recommendation logic

### Changes Required

#### A. Update Unit Types
```typescript
// Replace old types
type DimensionUnit = 'feet' | 'inches' | 'cm' | 'meters'
type WeightUnit = 'lbs' | 'kg'

// With new types from dimensions.ts
import { DimensionUnit, WeightUnit } from '@/lib/dimensions'
// DimensionUnit = 'inches' | 'ft-in' | 'cm' | 'mm' | 'meters'
// WeightUnit = 'lbs' | 'kg' | 'ton'
```

#### B. Update Unit Options
```typescript
const DIMENSION_UNITS = [
  { value: 'ft-in', label: 'ft-in' },
  { value: 'inches', label: 'in' },
  { value: 'cm', label: 'cm' },
  { value: 'mm', label: 'mm' },
  { value: 'meters', label: 'm' },
]

const WEIGHT_UNITS = [
  { value: 'lbs', label: 'lbs' },
  { value: 'kg', label: 'kg' },
  { value: 'ton', label: 'ton' },
]
```

#### C. Import Conversion Functions
```typescript
import {
  DimensionUnit,
  WeightUnit,
  parseDimensionToInches,
  parseWeightToLbs,
  formatDimension,
  inchesToFtInInput,
  ftInInputToInches,
} from '@/lib/dimensions'
```

#### D. Add Conversion Display
Below each dimension/weight input, show the converted value:
```tsx
<div className="text-xs text-muted-foreground">
  = {parseDimensionToInches(value, unit)}" ({formatDimension(parseDimensionToInches(value, unit))})
</div>
```

#### E. Update Truck Recommendation Logic
Ensure truck recommendation uses `parseDimensionToInches()` and `parseWeightToLbs()` for conversion before calculation.

---

## 5. Testing Checklist

- [ ] ft-in input parses correctly (e.g., "30-4" → 364")
- [ ] Smart detection works (values > 70 treated as inches)
- [ ] mm unit converts correctly
- [ ] ton unit converts correctly (1 ton = 2000 lbs)
- [ ] Conversion display updates in real-time
- [ ] Truck recommendation updates when values change
- [ ] Truck recommendation uses converted values (inches/lbs)

---

## 6. Related Files

| File | Purpose |
|------|---------|
| `src/lib/dimensions.ts` | Core conversion utilities |
| `src/components/quotes/equipment-block-card.tsx` | Equipment dimensions (ft-in with smart detection) |
| `src/components/inland/cargo-item-card.tsx` | Standalone inland quote cargo (unit selection) |
| `src/components/quotes/inland-transport-form.tsx` | **TARGET**: Dismantle quote inland tab |
