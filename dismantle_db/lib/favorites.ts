const FAVORITES_KEY = 'equipment_rates_favorites'

export function getFavorites(): Set<string> {
  if (typeof window === 'undefined') return new Set()

  try {
    const stored = localStorage.getItem(FAVORITES_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

export function toggleFavorite(rateId: string): boolean {
  const favorites = getFavorites()

  if (favorites.has(rateId)) {
    favorites.delete(rateId)
  } else {
    favorites.add(rateId)
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)))
  return favorites.has(rateId)
}

export function isFavorite(rateId: string): boolean {
  return getFavorites().has(rateId)
}

export function clearAllFavorites(): void {
  localStorage.removeItem(FAVORITES_KEY)
}
