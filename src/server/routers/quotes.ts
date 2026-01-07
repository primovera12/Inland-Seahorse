import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { generateQuoteNumber } from '@/lib/utils'

const quoteDataSchema = z.object({
  quote_number: z.string(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']),
  customer_name: z.string(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().optional(),
  customer_company: z.string().optional(),
  company_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  make_id: z.string().uuid().optional(),
  model_id: z.string().uuid().optional(),
  make_name: z.string(),
  model_name: z.string(),
  location: z.enum([
    'New Jersey',
    'Savannah',
    'Houston',
    'Chicago',
    'Oakland',
    'Long Beach',
  ]),
  subtotal: z.number(),
  margin_percentage: z.number(),
  margin_amount: z.number(),
  total: z.number(),
  quote_data: z.record(z.string(), z.unknown()),
})

export const quotesRouter = router({
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
        .from('quote_history')
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
        .from('quote_history')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error) throw error
      return data
    }),

  // Create quote
  create: protectedProcedure
    .input(quoteDataSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('quote_history')
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
        data: quoteDataSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('quote_history')
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
        .from('quote_history')
        .delete()
        .eq('id', input.id)

      if (error) throw error
      return { success: true }
    }),

  // Generate new quote number
  generateNumber: protectedProcedure.query(async ({ ctx }) => {
    // Get the quote prefix from settings
    const { data: settings } = await ctx.supabase
      .from('company_settings')
      .select('quote_prefix')
      .single()

    const prefix = settings?.quote_prefix || 'QT'
    return generateQuoteNumber(prefix)
  }),

  // Save draft
  saveDraft: protectedProcedure
    .input(z.object({ quote_data: z.record(z.string(), z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      // Check if user has an existing draft
      const { data: existing } = await ctx.supabase
        .from('quote_drafts')
        .select('id')
        .eq('user_id', ctx.user.id)
        .single()

      if (existing) {
        // Update existing draft
        const { data, error } = await ctx.supabase
          .from('quote_drafts')
          .update({
            quote_data: input.quote_data,
            last_saved_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Create new draft
        const { data, error } = await ctx.supabase
          .from('quote_drafts')
          .insert({
            user_id: ctx.user.id,
            quote_data: input.quote_data,
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    }),

  // Get user's draft
  getDraft: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('quote_drafts')
      .select('*')
      .eq('user_id', ctx.user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }),
})
