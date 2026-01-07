import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'

export const equipmentRouter = router({
  // Get all makes (sorted by popularity)
  getMakes: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('makes')
      .select('*')
      .order('popularity_rank', { ascending: true })

    if (error) throw error
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

      if (error) throw error
      return data
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

      if (error && error.code !== 'PGRST116') throw error
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

      if (error && error.code !== 'PGRST116') throw error
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

      if (error) throw error
      return data
    }),

  // Search equipment (makes + models)
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // Search makes
      const { data: makes } = await ctx.supabase
        .from('makes')
        .select('id, name')
        .ilike('name', `%${input.query}%`)
        .limit(5)

      // Search models with make info
      const { data: models } = await ctx.supabase
        .from('models')
        .select('id, name, make_id, makes(name)')
        .ilike('name', `%${input.query}%`)
        .limit(10)

      return {
        makes: makes || [],
        models: models || [],
      }
    }),
})
