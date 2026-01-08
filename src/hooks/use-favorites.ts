'use client'

import { useState, useEffect, useCallback } from 'react'

export interface FavoriteEquipment {
  modelId: string
  makeId: string
  makeName: string
  modelName: string
  addedAt: string
}

const STORAGE_KEY = 'dismantle-pro-favorites'

function getStoredFavorites(): FavoriteEquipment[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveStoredFavorites(items: FavoriteEquipment[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage full or disabled, ignore
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteEquipment[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    setFavorites(getStoredFavorites())
  }, [])

  // Check if an equipment is a favorite
  const isFavorite = useCallback(
    (modelId: string): boolean => {
      return favorites.some((f) => f.modelId === modelId)
    },
    [favorites]
  )

  // Toggle favorite status
  const toggleFavorite = useCallback(
    (item: Omit<FavoriteEquipment, 'addedAt'>) => {
      setFavorites((prev) => {
        const existingIndex = prev.findIndex((f) => f.modelId === item.modelId)
        let updated: FavoriteEquipment[]

        if (existingIndex >= 0) {
          // Remove from favorites
          updated = prev.filter((_, i) => i !== existingIndex)
        } else {
          // Add to favorites
          const newFavorite: FavoriteEquipment = {
            ...item,
            addedAt: new Date().toISOString(),
          }
          updated = [newFavorite, ...prev]
        }

        saveStoredFavorites(updated)
        return updated
      })
    },
    []
  )

  // Add to favorites
  const addFavorite = useCallback(
    (item: Omit<FavoriteEquipment, 'addedAt'>) => {
      setFavorites((prev) => {
        if (prev.some((f) => f.modelId === item.modelId)) {
          return prev // Already exists
        }

        const newFavorite: FavoriteEquipment = {
          ...item,
          addedAt: new Date().toISOString(),
        }
        const updated = [newFavorite, ...prev]
        saveStoredFavorites(updated)
        return updated
      })
    },
    []
  )

  // Remove from favorites
  const removeFavorite = useCallback((modelId: string) => {
    setFavorites((prev) => {
      const updated = prev.filter((f) => f.modelId !== modelId)
      saveStoredFavorites(updated)
      return updated
    })
  }, [])

  // Clear all favorites
  const clearFavorites = useCallback(() => {
    setFavorites([])
    saveStoredFavorites([])
  }, [])

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
  }
}
