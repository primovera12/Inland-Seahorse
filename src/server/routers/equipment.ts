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
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        checkSupabaseError(error, 'Equipment dimensions')
      }
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
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        checkSupabaseError(error, 'Equipment rates')
      }
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
        frontImageUrl: z.string().url().nullable().or(z.literal('')).transform(val => val === '' ? null : val).optional(),
        sideImageUrl: z.string().url().nullable().or(z.literal('')).transform(val => val === '' ? null : val).optional(),
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

  // ===== MAKES CRUD =====
  createMake: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('makes')
        .insert({ name: input.name })
        .select()
        .single()

      checkSupabaseError(error, 'Create make')
      return data
    }),

  updateMake: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      popularity_rank: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = { name: input.name }
      if (input.popularity_rank !== undefined) {
        updates.popularity_rank = input.popularity_rank
      }

      const { data, error } = await ctx.supabase
        .from('makes')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single()

      checkSupabaseError(error, 'Update make')
      return data
    }),

  deleteMake: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // This will cascade delete models, dimensions, and rates
      const { error } = await ctx.supabase
        .from('makes')
        .delete()
        .eq('id', input.id)

      checkSupabaseError(error, 'Delete make')
      return { success: true }
    }),

  // ===== MODELS CRUD =====
  createModel: protectedProcedure
    .input(z.object({
      makeId: z.string().uuid(),
      name: z.string().min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('models')
        .insert({ make_id: input.makeId, name: input.name })
        .select()
        .single()

      checkSupabaseError(error, 'Create model')
      return data
    }),

  updateModel: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('models')
        .update({ name: input.name })
        .eq('id', input.id)
        .select()
        .single()

      checkSupabaseError(error, 'Update model')
      return data
    }),

  deleteModel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // This will cascade delete dimensions and rates
      const { error } = await ctx.supabase
        .from('models')
        .delete()
        .eq('id', input.id)

      checkSupabaseError(error, 'Delete model')
      return { success: true }
    }),

  // ===== DIMENSIONS CRUD =====
  upsertDimensions: protectedProcedure
    .input(z.object({
      modelId: z.string().uuid(),
      length_inches: z.number().int().min(0).default(0),
      width_inches: z.number().int().min(0).default(0),
      height_inches: z.number().int().min(0).default(0),
      weight_lbs: z.number().int().min(0).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('equipment_dimensions')
        .upsert({
          model_id: input.modelId,
          length_inches: input.length_inches,
          width_inches: input.width_inches,
          height_inches: input.height_inches,
          weight_lbs: input.weight_lbs,
        }, { onConflict: 'model_id' })
        .select()
        .single()

      checkSupabaseError(error, 'Upsert dimensions')
      return data
    }),

  // ===== RATES CRUD =====
  upsertRate: protectedProcedure
    .input(z.object({
      makeId: z.string().uuid(),
      modelId: z.string().uuid(),
      location: z.enum([
        'New Jersey',
        'Savannah',
        'Houston',
        'Chicago',
        'Oakland',
        'Long Beach',
      ]),
      dismantling_loading_cost: z.number().int().min(0).default(0),
      loading_cost: z.number().int().min(0).default(0),
      blocking_bracing_cost: z.number().int().min(0).default(0),
      rigging_cost: z.number().int().min(0).default(0),
      storage_cost: z.number().int().min(0).default(0),
      transport_cost: z.number().int().min(0).default(0),
      equipment_cost: z.number().int().min(0).default(0),
      labor_cost: z.number().int().min(0).default(0),
      permit_cost: z.number().int().min(0).default(0),
      escort_cost: z.number().int().min(0).default(0),
      miscellaneous_cost: z.number().int().min(0).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('rates')
        .upsert({
          make_id: input.makeId,
          model_id: input.modelId,
          location: input.location,
          dismantling_loading_cost: input.dismantling_loading_cost,
          loading_cost: input.loading_cost,
          blocking_bracing_cost: input.blocking_bracing_cost,
          rigging_cost: input.rigging_cost,
          storage_cost: input.storage_cost,
          transport_cost: input.transport_cost,
          equipment_cost: input.equipment_cost,
          labor_cost: input.labor_cost,
          permit_cost: input.permit_cost,
          escort_cost: input.escort_cost,
          miscellaneous_cost: input.miscellaneous_cost,
        }, { onConflict: 'model_id,location' })
        .select()
        .single()

      checkSupabaseError(error, 'Upsert rate')
      return data
    }),

  deleteRate: protectedProcedure
    .input(z.object({
      modelId: z.string().uuid(),
      location: z.enum([
        'New Jersey',
        'Savannah',
        'Houston',
        'Chicago',
        'Oakland',
        'Long Beach',
      ]),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('rates')
        .delete()
        .eq('model_id', input.modelId)
        .eq('location', input.location)

      checkSupabaseError(error, 'Delete rate')
      return { success: true }
    }),

  // ===== DIMENSION MIGRATION =====
  // Preview dimensions that look like they were entered in ft.in format
  previewDimensionMigration: protectedProcedure
    .query(async ({ ctx }) => {
      // Thresholds - values at or below these are likely ft.in format
      const THRESHOLDS = {
        length: 70,  // 70 inches = ~5'10" - equipment is usually longer
        width: 16,   // 16 inches
        height: 18,  // 18 inches
      }

      // Helper to convert ft.in to inches (e.g., 10.6 -> 126 inches)
      const convertFtInToInches = (value: number): number => {
        const feet = Math.floor(value)
        const decimalPart = value - feet
        const inches = Math.round(decimalPart * 10)
        return feet * 12 + inches
      }

      // Fetch all dimensions with model names
      const { data: dimensions, error } = await ctx.supabase
        .from('equipment_dimensions')
        .select(`
          id,
          model_id,
          length_inches,
          width_inches,
          height_inches,
          weight_lbs,
          models!inner(name, makes!inner(name))
        `)

      checkSupabaseError(error, 'Fetch dimensions for migration')

      const needsConversion: Array<{
        id: string
        model_id: string
        make_name: string
        model_name: string
        current: { length: number; width: number; height: number }
        converted: { length: number; width: number; height: number }
        changes: string[]
      }> = []

      for (const dim of dimensions || []) {
        const changes: string[] = []
        const converted = {
          length: dim.length_inches,
          width: dim.width_inches,
          height: dim.height_inches,
        }

        // Check each dimension
        if (dim.length_inches > 0 && dim.length_inches <= THRESHOLDS.length) {
          converted.length = convertFtInToInches(dim.length_inches)
          changes.push(`length: ${dim.length_inches} -> ${converted.length} (${Math.floor(converted.length/12)}'${converted.length%12}")`)
        }
        if (dim.width_inches > 0 && dim.width_inches <= THRESHOLDS.width) {
          converted.width = convertFtInToInches(dim.width_inches)
          changes.push(`width: ${dim.width_inches} -> ${converted.width} (${Math.floor(converted.width/12)}'${converted.width%12}")`)
        }
        if (dim.height_inches > 0 && dim.height_inches <= THRESHOLDS.height) {
          converted.height = convertFtInToInches(dim.height_inches)
          changes.push(`height: ${dim.height_inches} -> ${converted.height} (${Math.floor(converted.height/12)}'${converted.height%12}")`)
        }

        if (changes.length > 0) {
          const modelData = dim.models as { name: string; makes: { name: string } }
          needsConversion.push({
            id: dim.id,
            model_id: dim.model_id,
            make_name: modelData.makes.name,
            model_name: modelData.name,
            current: {
              length: dim.length_inches,
              width: dim.width_inches,
              height: dim.height_inches,
            },
            converted,
            changes,
          })
        }
      }

      return {
        totalDimensions: dimensions?.length || 0,
        needsConversion: needsConversion.length,
        items: needsConversion,
      }
    }),

  // Apply dimension migration
  applyDimensionMigration: protectedProcedure
    .mutation(async ({ ctx }) => {
      const THRESHOLDS = {
        length: 70,
        width: 16,
        height: 18,
      }

      const convertFtInToInches = (value: number): number => {
        const feet = Math.floor(value)
        const decimalPart = value - feet
        const inches = Math.round(decimalPart * 10)
        return feet * 12 + inches
      }

      const { data: dimensions, error: fetchError } = await ctx.supabase
        .from('equipment_dimensions')
        .select('id, model_id, length_inches, width_inches, height_inches')

      checkSupabaseError(fetchError, 'Fetch dimensions for migration')

      let updatedCount = 0

      for (const dim of dimensions || []) {
        let needsUpdate = false
        const updates: { length_inches?: number; width_inches?: number; height_inches?: number } = {}

        if (dim.length_inches > 0 && dim.length_inches <= THRESHOLDS.length) {
          updates.length_inches = convertFtInToInches(dim.length_inches)
          needsUpdate = true
        }
        if (dim.width_inches > 0 && dim.width_inches <= THRESHOLDS.width) {
          updates.width_inches = convertFtInToInches(dim.width_inches)
          needsUpdate = true
        }
        if (dim.height_inches > 0 && dim.height_inches <= THRESHOLDS.height) {
          updates.height_inches = convertFtInToInches(dim.height_inches)
          needsUpdate = true
        }

        if (needsUpdate) {
          const { error: updateError } = await ctx.supabase
            .from('equipment_dimensions')
            .update(updates)
            .eq('id', dim.id)

          checkSupabaseError(updateError, `Update dimensions for ${dim.model_id}`)
          updatedCount++
        }
      }

      return {
        success: true,
        updatedCount,
      }
    }),
})
