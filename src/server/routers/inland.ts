import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { generateInlandQuoteNumber } from '@/lib/utils'

const inlandQuoteDataSchema = z.object({
  quote_number: z.string(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']),
  customer_name: z.string(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().optional(),
  customer_company: z.string().optional(),
  company_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  subtotal: z.number(),
  margin_percentage: z.number(),
  margin_amount: z.number(),
  total: z.number(),
  quote_data: z.record(z.string(), z.unknown()),
})

export const inlandRouter = router({
  // Get equipment types (trucks)
  getEquipmentTypes: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('inland_equipment_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw error
    return data
  }),

  // Get accessorial types
  getAccessorialTypes: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('inland_accessorial_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw error
    return data
  }),

  // Get rate tiers
  getRateTiers: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('inland_rate_tiers')
      .select('*')
      .eq('is_active', true)
      .order('min_miles')

    if (error) throw error
    return data
  }),

  // Get saved lanes
  getSavedLanes: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('inland_saved_lanes')
        .select('*')
        .order('use_count', { ascending: false })

      if (input.limit) {
        query = query.limit(input.limit)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }),

  // Create saved lane
  createSavedLane: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        pickup_address: z.string(),
        pickup_city: z.string().optional(),
        pickup_state: z.string().optional(),
        pickup_place_id: z.string().optional(),
        dropoff_address: z.string(),
        dropoff_city: z.string().optional(),
        dropoff_state: z.string().optional(),
        dropoff_place_id: z.string().optional(),
        distance_miles: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inland_saved_lanes')
        .insert({
          ...input,
          use_count: 1,
          last_used_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    }),

  // Get rate for distance
  getRateForDistance: protectedProcedure
    .input(z.object({ distanceMiles: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inland_rate_tiers')
        .select('*')
        .eq('is_active', true)
        .lte('min_miles', input.distanceMiles)
        .gte('max_miles', input.distanceMiles)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    }),

  // Get quote history
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z
          .enum(['draft', 'sent', 'accepted', 'rejected', 'expired'])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('inland_quotes')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.status) {
        query = query.eq('status', input.status)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { quotes: data, total: count }
    }),

  // Get single quote
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inland_quotes')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error) throw error
      return data
    }),

  // Create quote
  create: protectedProcedure
    .input(inlandQuoteDataSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inland_quotes')
        .insert({
          ...input,
          created_by: ctx.user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    }),

  // Update quote
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: inlandQuoteDataSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inland_quotes')
        .update(input.data)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error
      return data
    }),

  // Delete quote
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('inland_quotes')
        .delete()
        .eq('id', input.id)

      if (error) throw error
      return { success: true }
    }),

  // Generate new quote number
  generateNumber: protectedProcedure.query(async () => {
    return generateInlandQuoteNumber()
  }),

  // Update quote status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inland_quotes')
        .update({
          status: input.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error
      return data
    }),

  // Mark as sent
  markAsSent: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inland_quotes')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error
      return data
    }),

  // Mark as accepted
  markAsAccepted: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inland_quotes')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error
      return data
    }),

  // Mark as rejected
  markAsRejected: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        rejection_reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inland_quotes')
        .update({
          status: 'rejected',
          rejection_reason: input.rejection_reason,
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error
      return data
    }),
})
