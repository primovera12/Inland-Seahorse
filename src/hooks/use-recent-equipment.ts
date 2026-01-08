'use client'

import { useState, useEffect, useCallback } from 'react'

export interface RecentEquipmentItem {
  modelId: string
  makeId: string
  makeName: string
  modelName: string
  usedAt: string
  useCount: number
}

const STORAGE_KEY = 'dismantle-pro-recent-equipment'
const MAX_RECENT_ITEMS = 10

function getStoredEquipment(): RecentEquipmentItem[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveStoredEquipment(items: RecentEquipmentItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage full or disabled, ignore
  }
}

export function useRecentEquipment() {
  const [recentEquipment, setRecentEquipment] = useState<RecentEquipmentItem[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    setRecentEquipment(getStoredEquipment())
  }, [])

  // Track equipment usage
  const trackEquipmentUsage = useCallback(
    (item: Omit<RecentEquipmentItem, 'usedAt' | 'useCount'>) => {
      setRecentEquipment((prev) => {
        // Find existing item
        const existingIndex = prev.findIndex((e) => e.modelId === item.modelId)

        let updated: RecentEquipmentItem[]

        if (existingIndex >= 0) {
          // Update existing item
          const existing = prev[existingIndex]
          const updatedItem: RecentEquipmentItem = {
            ...existing,
            usedAt: new Date().toISOString(),
            useCount: existing.useCount + 1,
          }
          // Move to front
          updated = [updatedItem, ...prev.filter((_, i) => i !== existingIndex)]
        } else {
          // Add new item at front
          const newItem: RecentEquipmentItem = {
            ...item,
            usedAt: new Date().toISOString(),
            useCount: 1,
          }
          updated = [newItem, ...prev]
        }

        // Keep only max items
        updated = updated.slice(0, MAX_RECENT_ITEMS)

        // Save to localStorage
        saveStoredEquipment(updated)

        return updated
      })
    },
    []
  )

  // Clear recent equipment
  const clearRecentEquipment = useCallback(() => {
    setRecentEquipment([])
    saveStoredEquipment([])
  }, [])

  return {
    recentEquipment,
    trackEquipmentUsage,
    clearRecentEquipment,
  }
}
