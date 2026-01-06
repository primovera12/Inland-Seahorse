// Popular makes ordered by frequency in heavy equipment dismantling
export const POPULAR_MAKES = [
  'Caterpillar',
  'John Deere',
  'Komatsu',
  'Bobcat',
  'Kubota',
  'Case',
  'New Holland',
  'Volvo',
  'Hitachi',
  'JCB',
  'Toyota',
  'Hyster',
  'Yale',
  'Crown',
  'Genie',
  'JLG',
  'Skyjack',
  'Liebherr',
  'Tadano',
  'Grove',
]

// Sort makes with popular ones first, then alphabetically
export function sortMakesByPopularity<T>(
  items: T[],
  getNameFn: (item: T) => string
): T[] {
  return items.sort((a, b) => {
    const aName = getNameFn(a)
    const bName = getNameFn(b)

    const aIndex = POPULAR_MAKES.indexOf(aName)
    const bIndex = POPULAR_MAKES.indexOf(bName)

    // Both are popular - sort by popularity index
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex
    }

    // Only A is popular - A comes first
    if (aIndex !== -1) {
      return -1
    }

    // Only B is popular - B comes first
    if (bIndex !== -1) {
      return 1
    }

    // Neither is in popular list - sort alphabetically
    return aName.localeCompare(bName)
  })
}
