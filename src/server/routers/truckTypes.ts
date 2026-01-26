import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc/trpc'
import { TRPCError } from '@trpc/server'
import {
  type TruckTypeRow,
  type TruckTypeRecord,
  type TruckTypeListItem,
  truckTypeRowToRecord,
  truckTypeRowToListItem,
  TRUCK_CATEGORIES,
  LOADING_METHODS,
} from '@/types/truck-types'

// =============================================================================
// HELPER
// =============================================================================

function checkSupabaseError(error: any) {
  if (error) {
    console.error('Supabase error:', error)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Database error',
    })
  }
}

// =============================================================================
// SCHEMAS
// =============================================================================

const truckCategorySchema = z.enum(TRUCK_CATEGORIES)
const loadingMethodSchema = z.enum(LOADING_METHODS)

const createTruckTypeSchema = z.object({
  name: z.string().min(1).max(100),
  category: truckCategorySchema,
  description: z.string().max(500).optional(),

  deckHeightFt: z.number().positive().max(20),
  deckLengthFt: z.number().positive().max(200),
  deckWidthFt: z.number().positive().max(20).default(8.5),
  wellLengthFt: z.number().positive().max(100).optional(),
  wellHeightFt: z.number().positive().max(10).optional(),

  maxCargoWeightLbs: z.number().int().positive().max(1000000),
  tareWeightLbs: z.number().int().positive().max(200000).optional(),

  maxLegalCargoHeightFt: z.number().positive().max(15).optional(),
  maxLegalCargoWidthFt: z.number().positive().max(20).optional(),

  features: z.array(z.string().max(200)).max(10).optional(),
  bestFor: z.array(z.string().max(200)).max(10).optional(),
  loadingMethod: loadingMethodSchema.optional(),

  isActive: z.boolean().default(true),
  baseRateCents: z.number().int().min(0).optional(),
  ratePerMileCents: z.number().int().min(0).optional(),

  sortOrder: z.number().int().min(0).default(0),
})

const updateTruckTypeSchema = createTruckTypeSchema.partial().extend({
  id: z.string().uuid(),
})

// =============================================================================
// ROUTER
// =============================================================================

export const truckTypesRouter = router({
  // ---------------------------------------------------------------------------
  // GET ALL (with optional filters)
  // ---------------------------------------------------------------------------
  getAll: protectedProcedure
    .input(
      z.object({
        category: truckCategorySchema.optional(),
        loadingMethod: loadingMethodSchema.optional(),
        includeInactive: z.boolean().default(false),
        search: z.string().optional(),
        limit: z.number().int().positive().max(100).default(100),
        offset: z.number().int().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx
      const {
        category,
        loadingMethod,
        includeInactive = false,
        search,
        limit = 100,
        offset = 0,
      } = input || {}

      let query = supabase
        .from('truck_types')
        .select('*', { count: 'exact' })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      // Filter by active status
      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      // Filter by category
      if (category) {
        query = query.eq('category', category)
      }

      // Filter by loading method
      if (loadingMethod) {
        query = query.eq('loading_method', loadingMethod)
      }

      // Search
      if (search && search.trim()) {
        query = query.or(
          `name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`
        )
      }

      // Pagination
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      checkSupabaseError(error)

      const items = (data || []).map((row: TruckTypeRow) => truckTypeRowToListItem(row))

      return {
        data: items,
        total: count || 0,
        limit,
        offset,
      }
    }),

  // ---------------------------------------------------------------------------
  // GET BY ID
  // ---------------------------------------------------------------------------
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data, error } = await supabase
        .from('truck_types')
        .select('*')
        .eq('id', input.id)
        .single()

      checkSupabaseError(error)

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Truck type not found',
        })
      }

      return truckTypeRowToRecord(data as TruckTypeRow)
    }),

  // ---------------------------------------------------------------------------
  // GET BY CATEGORY
  // ---------------------------------------------------------------------------
  getByCategory: protectedProcedure
    .input(z.object({ category: truckCategorySchema }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data, error } = await supabase
        .from('truck_types')
        .select('*')
        .eq('category', input.category)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      checkSupabaseError(error)

      return (data || []).map((row: TruckTypeRow) => truckTypeRowToRecord(row))
    }),

  // ---------------------------------------------------------------------------
  // GET ALL FOR LOAD PLANNER (active only, full records)
  // Used by the Load Planner AI to recommend trucks
  // ---------------------------------------------------------------------------
  getForLoadPlanner: protectedProcedure.query(async ({ ctx }) => {
    const { supabase } = ctx

    const { data, error } = await supabase
      .from('truck_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    checkSupabaseError(error)

    return (data || []).map((row: TruckTypeRow) => truckTypeRowToRecord(row))
  }),

  // ---------------------------------------------------------------------------
  // GET CATEGORIES WITH COUNTS
  // ---------------------------------------------------------------------------
  getCategoryCounts: protectedProcedure.query(async ({ ctx }) => {
    const { supabase } = ctx

    const { data, error } = await supabase
      .from('truck_types')
      .select('category')
      .eq('is_active', true)

    checkSupabaseError(error)

    const counts: Record<string, number> = {}
    for (const row of data || []) {
      counts[row.category] = (counts[row.category] || 0) + 1
    }

    return counts
  }),

  // ---------------------------------------------------------------------------
  // CREATE (Admin only)
  // ---------------------------------------------------------------------------
  create: adminProcedure.input(createTruckTypeSchema).mutation(async ({ ctx, input }) => {
    const { supabase } = ctx

    const insertData = {
      name: input.name,
      category: input.category,
      description: input.description || null,

      deck_height_ft: input.deckHeightFt,
      deck_length_ft: input.deckLengthFt,
      deck_width_ft: input.deckWidthFt,
      well_length_ft: input.wellLengthFt || null,
      well_height_ft: input.wellHeightFt || null,

      max_cargo_weight_lbs: input.maxCargoWeightLbs,
      tare_weight_lbs: input.tareWeightLbs || null,

      max_legal_cargo_height_ft: input.maxLegalCargoHeightFt || null,
      max_legal_cargo_width_ft: input.maxLegalCargoWidthFt || null,

      features: input.features || [],
      best_for: input.bestFor || [],
      loading_method: input.loadingMethod || null,

      is_active: input.isActive ?? true,
      base_rate_cents: input.baseRateCents || null,
      rate_per_mile_cents: input.ratePerMileCents || null,

      sort_order: input.sortOrder ?? 0,
    }

    const { data, error } = await supabase
      .from('truck_types')
      .insert(insertData)
      .select()
      .single()

    checkSupabaseError(error)

    return truckTypeRowToRecord(data as TruckTypeRow)
  }),

  // ---------------------------------------------------------------------------
  // UPDATE (Admin only)
  // ---------------------------------------------------------------------------
  update: adminProcedure.input(updateTruckTypeSchema).mutation(async ({ ctx, input }) => {
    const { supabase } = ctx
    const { id, ...updates } = input

    const updateData: Record<string, any> = {}

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.description !== undefined) updateData.description = updates.description || null

    if (updates.deckHeightFt !== undefined) updateData.deck_height_ft = updates.deckHeightFt
    if (updates.deckLengthFt !== undefined) updateData.deck_length_ft = updates.deckLengthFt
    if (updates.deckWidthFt !== undefined) updateData.deck_width_ft = updates.deckWidthFt
    if (updates.wellLengthFt !== undefined) updateData.well_length_ft = updates.wellLengthFt || null
    if (updates.wellHeightFt !== undefined) updateData.well_height_ft = updates.wellHeightFt || null

    if (updates.maxCargoWeightLbs !== undefined) updateData.max_cargo_weight_lbs = updates.maxCargoWeightLbs
    if (updates.tareWeightLbs !== undefined) updateData.tare_weight_lbs = updates.tareWeightLbs || null

    if (updates.maxLegalCargoHeightFt !== undefined) updateData.max_legal_cargo_height_ft = updates.maxLegalCargoHeightFt || null
    if (updates.maxLegalCargoWidthFt !== undefined) updateData.max_legal_cargo_width_ft = updates.maxLegalCargoWidthFt || null

    if (updates.features !== undefined) updateData.features = updates.features || []
    if (updates.bestFor !== undefined) updateData.best_for = updates.bestFor || []
    if (updates.loadingMethod !== undefined) updateData.loading_method = updates.loadingMethod || null

    if (updates.isActive !== undefined) updateData.is_active = updates.isActive
    if (updates.baseRateCents !== undefined) updateData.base_rate_cents = updates.baseRateCents || null
    if (updates.ratePerMileCents !== undefined) updateData.rate_per_mile_cents = updates.ratePerMileCents || null

    if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder

    if (Object.keys(updateData).length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No fields to update',
      })
    }

    const { data, error } = await supabase
      .from('truck_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    checkSupabaseError(error)

    return truckTypeRowToRecord(data as TruckTypeRow)
  }),

  // ---------------------------------------------------------------------------
  // DELETE (Admin only - soft delete by setting is_active = false)
  // ---------------------------------------------------------------------------
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      // Soft delete - set is_active = false
      const { error } = await supabase
        .from('truck_types')
        .update({ is_active: false })
        .eq('id', input.id)

      checkSupabaseError(error)

      return { success: true }
    }),

  // ---------------------------------------------------------------------------
  // HARD DELETE (Admin only - permanently remove)
  // ---------------------------------------------------------------------------
  hardDelete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { error } = await supabase
        .from('truck_types')
        .delete()
        .eq('id', input.id)

      checkSupabaseError(error)

      return { success: true }
    }),

  // ---------------------------------------------------------------------------
  // RESTORE (Admin only - set is_active = true)
  // ---------------------------------------------------------------------------
  restore: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data, error } = await supabase
        .from('truck_types')
        .update({ is_active: true })
        .eq('id', input.id)
        .select()
        .single()

      checkSupabaseError(error)

      return truckTypeRowToRecord(data as TruckTypeRow)
    }),

  // ---------------------------------------------------------------------------
  // REORDER (Admin only - update sort_order for multiple items)
  // ---------------------------------------------------------------------------
  reorder: adminProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.string().uuid(),
            sortOrder: z.number().int().min(0),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      // Update each item's sort_order
      for (const item of input.items) {
        const { error } = await supabase
          .from('truck_types')
          .update({ sort_order: item.sortOrder })
          .eq('id', item.id)

        checkSupabaseError(error)
      }

      return { success: true }
    }),
})
