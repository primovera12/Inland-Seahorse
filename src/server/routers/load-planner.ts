import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { createClient } from '@supabase/supabase-js'
import {
  // Truck data
  trucks,
  getTruckById,
  getTrucksByCategory,
  getCategories,
  // Truck selection
  selectTrucks,
  getBestTruck,
  calculateFitAnalysis,
  getRequiredPermits,
  // Export the options type
  type TruckSelectionOptions,
  // Load planning
  planLoads,
  // Permits
  calculateRoutePermits,
  getStatesRequiringPermits,
  estimateTotalCost,
  // State data
  getStateByCode,
  getAllStateCodes,
  // Parsing
  parseTextWithAI,
  parseImageWithAI,
  // Types
  type LoadItem,
  type TruckType,
} from '@/lib/load-planner'

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const LoadItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number().min(1),
  length: z.number().min(0), // feet
  width: z.number().min(0), // feet
  height: z.number().min(0), // feet
  weight: z.number().min(0), // pounds
  stackable: z.boolean().optional(),
  fragile: z.boolean().optional(),
  hazmat: z.boolean().optional(),
  sku: z.string().optional(),
  notes: z.string().optional(),
})

// Legacy format (inches) for backward compatibility
const CargoItemLegacySchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number(),
  length_inches: z.number(),
  width_inches: z.number(),
  height_inches: z.number(),
  weight_lbs: z.number(),
})

const DimensionsSchema = z.object({
  height: z.number(), // feet
  width: z.number(), // feet
  length: z.number(), // feet
  weight: z.number(), // pounds (gross weight)
})

// =============================================================================
// ROUTER DEFINITION
// =============================================================================

export const loadPlannerRouter = router({
  // ---------------------------------------------------------------------------
  // TRUCK PROCEDURES
  // ---------------------------------------------------------------------------

  /**
   * Get all trucks or filter by category
   */
  getTrucks: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
      }).optional()
    )
    .query(({ input }) => {
      if (input?.category) {
        return getTrucksByCategory(input.category as TruckType['category'])
      }
      return trucks
    }),

  /**
   * Get a single truck by ID
   */
  getTruck: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return getTruckById(input.id)
    }),

  /**
   * Get all truck categories with counts
   */
  getCategories: protectedProcedure.query(() => {
    const categories = getCategories()
    return categories.map((cat) => ({
      id: cat,
      name: cat.replace(/_/g, ' '),
      count: trucks.filter((t) => t.category === cat).length,
    }))
  }),

  /**
   * Get truck recommendations for cargo
   */
  getRecommendations: protectedProcedure
    .input(
      z.object({
        items: z.array(LoadItemSchema),
        limit: z.number().min(1).max(10).optional().default(5),
        // Enhanced options for smart recommendations
        originState: z.string().length(2).optional(),
        destinationState: z.string().length(2).optional(),
        includeHistoricalBonus: z.boolean().optional().default(false),
        includeFitAlternatives: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const items = input.items as LoadItem[]
      // Convert LoadItem[] to ParsedLoad
      const parsedLoad = {
        length: Math.max(...items.map(i => i.length), 0),
        width: Math.max(...items.map(i => i.width), 0),
        height: Math.max(...items.map(i => i.height), 0),
        weight: Math.max(...items.map(i => i.weight * i.quantity), 0),
        totalWeight: items.reduce((sum, i) => sum + i.weight * i.quantity, 0),
        items,
        confidence: 100,
      }

      // Build selection options
      const options: TruckSelectionOptions = {
        includeFitAlternatives: input.includeFitAlternatives,
      }

      // OPTIMIZATION #3: Historical data integration
      // Query load_history for similar routes and get equipment type usage
      if (input.includeHistoricalBonus && input.originState && input.destinationState) {
        try {
          const supabase = ctx.supabase
          const sixMonthsAgo = new Date()
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

          const { data: historicalLoads } = await supabase
            .from('load_history')
            .select('equipment_type_used, cargo_length_in, cargo_width_in, cargo_height_in')
            .eq('origin_state', input.originState)
            .eq('destination_state', input.destinationState)
            .gte('pickup_date', sixMonthsAgo.toISOString())
            .not('equipment_type_used', 'is', null)
            .limit(100)

          if (historicalLoads && historicalLoads.length > 0) {
            // Count equipment type usage
            const usageCounts: Record<string, number> = {}
            for (const load of historicalLoads) {
              const equipType = load.equipment_type_used
              if (equipType) {
                usageCounts[equipType] = (usageCounts[equipType] || 0) + 1
              }
            }

            // Convert equipment types to truck categories and calculate bonuses
            // More frequent usage = higher bonus (max 15 points)
            const totalLoads = historicalLoads.length
            const historicalBonuses: Record<string, number> = {}

            // Map load_history equipment types to truck categories
            const equipmentToCategory: Record<string, string> = {
              'flatbed': 'FLATBED',
              'step_deck': 'STEP_DECK',
              'rgn': 'RGN',
              'lowboy': 'LOWBOY',
              'double_drop': 'DOUBLE_DROP',
              'hotshot': 'FLATBED', // Map hotshot to flatbed
              'conestoga': 'CONESTOGA',
              'dry_van': 'DRY_VAN',
              'reefer': 'REEFER',
            }

            for (const [equipType, count] of Object.entries(usageCounts)) {
              const category = equipmentToCategory[equipType]
              if (category) {
                // Scale bonus: 50%+ usage = 15 points, 25% = 8 points, 10% = 3 points
                const usagePercent = (count / totalLoads) * 100
                const bonus = Math.min(15, Math.round(usagePercent * 0.3))
                historicalBonuses[category] = Math.max(historicalBonuses[category] || 0, bonus)
              }
            }

            options.historicalBonuses = historicalBonuses
          }
        } catch {
          // Silently fail historical bonus - it's an enhancement, not critical
          console.warn('Failed to fetch historical bonuses')
        }
      }

      const recommendations = selectTrucks(parsedLoad, options)
      return recommendations.slice(0, input.limit)
    }),

  /**
   * Get the single best truck for cargo
   */
  getBestTruck: protectedProcedure
    .input(
      z.object({
        items: z.array(LoadItemSchema),
      })
    )
    .query(({ input }) => {
      const items = input.items as LoadItem[]
      // Convert LoadItem[] to ParsedLoad
      const parsedLoad = {
        length: Math.max(...items.map(i => i.length), 0),
        width: Math.max(...items.map(i => i.width), 0),
        height: Math.max(...items.map(i => i.height), 0),
        weight: Math.max(...items.map(i => i.weight * i.quantity), 0),
        totalWeight: items.reduce((sum, i) => sum + i.weight * i.quantity, 0),
        items,
        confidence: 100,
      }
      return getBestTruck(parsedLoad)
    }),

  /**
   * Calculate fit analysis for items on a specific truck
   */
  calculateFit: protectedProcedure
    .input(
      z.object({
        items: z.array(LoadItemSchema),
        truckId: z.string(),
      })
    )
    .query(({ input }) => {
      const truck = getTruckById(input.truckId)
      if (!truck) {
        throw new Error('Truck not found')
      }
      const items = input.items as LoadItem[]
      // Convert LoadItem[] to ParsedLoad
      const parsedLoad = {
        length: Math.max(...items.map(i => i.length), 0),
        width: Math.max(...items.map(i => i.width), 0),
        height: Math.max(...items.map(i => i.height), 0),
        weight: Math.max(...items.map(i => i.weight * i.quantity), 0),
        totalWeight: items.reduce((sum, i) => sum + i.weight * i.quantity, 0),
        items,
        confidence: 100,
      }
      return calculateFitAnalysis(parsedLoad, truck)
    }),

  // ---------------------------------------------------------------------------
  // LOAD PLANNING PROCEDURES
  // ---------------------------------------------------------------------------

  /**
   * Create a full load plan (multi-truck bin-packing)
   */
  planLoads: protectedProcedure
    .input(
      z.object({
        items: z.array(LoadItemSchema),
        preferredTruckTypes: z.array(z.string()).optional(),
        maxTrucks: z.number().min(1).max(20).optional(),
      })
    )
    .mutation(({ input }) => {
      const items = input.items as LoadItem[]
      // Convert LoadItem[] to ParsedLoad
      const parsedLoad = {
        length: Math.max(...items.map(i => i.length), 0),
        width: Math.max(...items.map(i => i.width), 0),
        height: Math.max(...items.map(i => i.height), 0),
        weight: Math.max(...items.map(i => i.weight * i.quantity), 0),
        totalWeight: items.reduce((sum, i) => sum + i.weight * i.quantity, 0),
        items,
        confidence: 100,
      }
      // Note: preferredTruckTypes and maxTrucks options are not currently used by planLoads
      return planLoads(parsedLoad)
    }),

  /**
   * Plan loads from legacy format (dimensions in inches)
   */
  planLoadsFromLegacy: protectedProcedure
    .input(
      z.object({
        items: z.array(CargoItemLegacySchema),
      })
    )
    .mutation(({ input }) => {
      // Convert inches to feet
      const converted: LoadItem[] = input.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        length: item.length_inches / 12,
        width: item.width_inches / 12,
        height: item.height_inches / 12,
        weight: item.weight_lbs,
        stackable: false,
        fragile: false,
        hazmat: false,
      }))
      // Convert LoadItem[] to ParsedLoad
      const parsedLoad = {
        length: Math.max(...converted.map(i => i.length), 0),
        width: Math.max(...converted.map(i => i.width), 0),
        height: Math.max(...converted.map(i => i.height), 0),
        weight: Math.max(...converted.map(i => i.weight * i.quantity), 0),
        totalWeight: converted.reduce((sum, i) => sum + i.weight * i.quantity, 0),
        items: converted,
        confidence: 100,
      }
      return planLoads(parsedLoad)
    }),

  // ---------------------------------------------------------------------------
  // PERMIT PROCEDURES
  // ---------------------------------------------------------------------------

  /**
   * Calculate permits required for cargo on a specific truck
   */
  calculatePermits: protectedProcedure
    .input(
      z.object({
        items: z.array(LoadItemSchema),
        truckId: z.string(),
      })
    )
    .mutation(({ input }) => {
      const truck = getTruckById(input.truckId)
      if (!truck) {
        throw new Error('Truck not found')
      }
      const items = input.items as LoadItem[]
      // Convert LoadItem[] to ParsedLoad
      const parsedLoad = {
        length: Math.max(...items.map(i => i.length), 0),
        width: Math.max(...items.map(i => i.width), 0),
        height: Math.max(...items.map(i => i.height), 0),
        weight: Math.max(...items.map(i => i.weight * i.quantity), 0),
        totalWeight: items.reduce((sum, i) => sum + i.weight * i.quantity, 0),
        items,
        confidence: 100,
      }
      return getRequiredPermits(parsedLoad, truck)
    }),

  /**
   * Get state-specific permit requirements
   */
  getStatePermits: protectedProcedure
    .input(
      z.object({
        stateCodes: z.array(z.string().length(2)),
        dimensions: DimensionsSchema,
      })
    )
    .query(({ input }) => {
      return calculateRoutePermits(input.stateCodes, {
        width: input.dimensions.width,
        height: input.dimensions.height,
        length: input.dimensions.length,
        grossWeight: input.dimensions.weight,
      })
    }),

  /**
   * Get states that require permits for given dimensions
   */
  getStatesRequiringPermits: protectedProcedure
    .input(
      z.object({
        dimensions: DimensionsSchema,
        stateCodes: z.array(z.string().length(2)).optional(),
      })
    )
    .query(({ input }) => {
      // Use provided state codes or default to all US states
      const states = input.stateCodes || getAllStateCodes()
      return getStatesRequiringPermits(states, {
        width: input.dimensions.width,
        height: input.dimensions.height,
        length: input.dimensions.length,
        grossWeight: input.dimensions.weight,
      })
    }),

  /**
   * Estimate total permit and escort costs for a route
   */
  estimateRouteCost: protectedProcedure
    .input(
      z.object({
        stateCodes: z.array(z.string().length(2)),
        dimensions: DimensionsSchema,
        distanceMiles: z.number().min(0),
      })
    )
    .query(({ input }) => {
      // Distribute total distance evenly across states for estimation
      const perStateDistance = input.stateCodes.length > 0
        ? input.distanceMiles / input.stateCodes.length
        : 0
      const stateDistances: Record<string, number> = {}
      for (const code of input.stateCodes) {
        stateDistances[code] = perStateDistance
      }
      return estimateTotalCost(
        input.stateCodes,
        {
          width: input.dimensions.width,
          height: input.dimensions.height,
          length: input.dimensions.length,
          grossWeight: input.dimensions.weight,
        },
        stateDistances
      )
    }),

  /**
   * Get all US state codes
   */
  getAllStateCodes: protectedProcedure.query(() => {
    return getAllStateCodes()
  }),

  /**
   * Get state permit data by code
   */
  getState: protectedProcedure
    .input(z.object({ stateCode: z.string().length(2) }))
    .query(({ input }) => {
      return getStateByCode(input.stateCode)
    }),

  // ---------------------------------------------------------------------------
  // AI PARSING PROCEDURES
  // ---------------------------------------------------------------------------

  /**
   * Parse text/email with AI to extract cargo items
   */
  parseText: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10),
      })
    )
    .mutation(async ({ input }) => {
      return parseTextWithAI(input.text)
    }),

  /**
   * Parse image with AI to extract cargo items
   */
  parseImage: protectedProcedure
    .input(
      z.object({
        imageBase64: z.string(),
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
      })
    )
    .mutation(async ({ input }) => {
      // Construct data URL from base64 and mimeType
      const dataUrl = input.imageBase64.startsWith('data:')
        ? input.imageBase64
        : `data:${input.mimeType};base64,${input.imageBase64}`
      return parseImageWithAI(dataUrl)
    }),
})

export type LoadPlannerRouter = typeof loadPlannerRouter
