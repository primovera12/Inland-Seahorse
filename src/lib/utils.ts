import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Tailwind class merge utility (required for shadcn/ui)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatting (stored in cents, displayed in dollars)
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

// Parse currency input to cents
export function parseCurrencyToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const dollars = parseFloat(cleaned) || 0
  return Math.round(dollars * 100)
}

// Format date for display
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

// Format date with time
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

// Generate quote number: QT-YYYYMMDD-XXXX
export function generateQuoteNumber(prefix = 'QT'): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${year}${month}${day}-${random}`
}

// Generate inland quote number
export function generateInlandQuoteNumber(): string {
  return generateQuoteNumber('IQ')
}
