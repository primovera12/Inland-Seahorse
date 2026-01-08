import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'

export const equipmentRouter = router({
  // Get all makes (sorted by popularity)
  getMakes: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('makes')
      .select('*')
      .order('popularity_rank', { ascending: true })

    checkSupabaseError(error, 'Equipment makes')
    return data
  }),

  // Get models for a make
  getModels: protectedProcedure
    .input(z.object({ makeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('models')
        .select('*')
        .eq('make_id', input.makeId)
        .order('name')

      checkSupabaseError(error, 'Equipment models')
      return data
    }),

  // Get models with dimension and rate availability
  getModelsWithAvailability: protectedProcedure
    .input(z.object({ makeId: z.string().uuid(), location: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // Get all models for the make
      const { data: models, error: modelsError } = await ctx.supabase
        .from('models')
        .select('id, name, make_id')
        .eq('make_id', input.makeId)
        .order('name')

      checkSupabaseError(modelsError, 'Equipment models')
      if (!models || models.length === 0) return []

      // Get all dimensions for these models
      const modelIds = models.map(m => m.id)
      const { data: dimensions } = await ctx.supabase
        .from('equipment_dimensions')
        .select('model_id')
        .in('model_id', modelIds)

      const dimensionModelIds = new Set((dimensions || []).map(d => d.model_id))

      // Get all rates for these models (optionally filtered by location)
      let ratesQuery = ctx.supabase
        .from('rates')
        .select('model_id')
        .in('model_id', modelIds)

      if (input.location) {
        ratesQuery = ratesQuery.eq('location', input.location)
      }

      const { data: rates } = await ratesQuery

      const rateModelIds = new Set((rates || []).map(r => r.model_id))

      // Combine the data
      return models.map(model => ({
        ...model,
        has_dimensions: dimensionModelIds.has(model.id),
        has_rates: rateModelIds.has(model.id),
      }))
    }),

  // Get dimensions for a model
  getDimensions: protectedProcedure
    .input(z.object({ modelId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('equipment_dimensions')
        .select('*')
        .eq('model_id', input.modelId)
        .single()

      checkSupabaseError(error, 'Equipment dimensions', true)
      return data
    }),

  // Get rates for a model and location
  getRates: protectedProcedure
    .input(
      z.object({
        modelId: z.string().uuid(),
        location: z.enum([
          'New Jersey',
          'Savannah',
          'Houston',
          'Chicago',
          'Oakland',
          'Long Beach',
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('rates')
        .select('*')
        .eq('model_id', input.modelId)
        .eq('location', input.location)
        .single()

      checkSupabaseError(error, 'Equipment rates', true)
      return data
    }),

  // Get all rates for a model (all locations)
  getAllRatesForModel: protectedProcedure
    .input(z.object({ modelId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('rates')
        .select('*')
        .eq('model_id', input.modelId)

      checkSupabaseError(error, 'Equipment rates')
      return data
    }),

  // Search equipment (makes + models)
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // Search makes
      const { data: makes, error: makesError } = await ctx.supabase
        .from('makes')
        .select('id, name')
        .ilike('name', `%${input.query}%`)
        .limit(5)

      checkSupabaseError(makesError, 'Equipment makes search')

      // Search models with make info
      const { data: models, error: modelsError } = await ctx.supabase
        .from('models')
        .select('id, name, make_id, makes(name)')
        .ilike('name', `%${input.query}%`)
        .limit(10)

      checkSupabaseError(modelsError, 'Equipment models search')

      return {
        makes: makes || [],
        models: models || [],
      }
    }),

  // Update equipment images
  updateImages: protectedProcedure
    .input(
      z.object({
        modelId: z.string().uuid(),
        frontImageUrl: z.string().url().nullable().optional(),
        sideImageUrl: z.string().url().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, string | null> = {}

      if (input.frontImageUrl !== undefined) {
        updates.front_image_url = input.frontImageUrl
      }
      if (input.sideImageUrl !== undefined) {
        updates.side_image_url = input.sideImageUrl
      }

      if (Object.keys(updates).length === 0) {
        return { success: true }
      }

      const { error } = await ctx.supabase
        .from('equipment_dimensions')
        .update(updates)
        .eq('model_id', input.modelId)

      checkSupabaseError(error, 'Equipment images')
      return { success: true }
    }),
})
