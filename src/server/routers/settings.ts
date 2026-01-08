import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'

export const settingsRouter = router({
  // Get company settings
  get: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('company_settings')
      .select('*')
      .single()

    checkSupabaseError(error, 'Settings', true)
    return data
  }),

  // Update company settings
  update: protectedProcedure
    .input(
      z.object({
        company_name: z.string().optional(),
        company_logo_url: z.string().url().nullable().optional(),
        logo_size_percentage: z.number().min(10).max(100).optional(),
        company_address: z.string().optional(),
        company_city: z.string().optional(),
        company_state: z.string().optional(),
        company_zip: z.string().optional(),
        company_phone: z.string().optional(),
        company_email: z.string().email().optional(),
        company_website: z.string().optional(),
        primary_color: z.string().optional(),
        secondary_color: z.string().nullable().optional(),
        default_payment_terms: z.string().optional(),
        quote_validity_days: z.number().min(1).optional(),
        default_margin_percentage: z.number().min(0).max(100).optional(),
        quote_prefix: z.string().optional(),
        fuel_surcharge_enabled: z.boolean().optional(),
        fuel_surcharge_percentage: z.number().optional(),
        doe_price_threshold: z.number().optional(),
        email_notifications_enabled: z.boolean().optional(),
        notification_email: z.string().email().nullable().optional(),
        terms_dismantle: z.string().nullable().optional(),
        terms_inland: z.string().nullable().optional(),
        popular_makes: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if settings exist
      const { data: existing } = await ctx.supabase
        .from('company_settings')
        .select('id, terms_version')
        .single()

      // Increment terms version if T&C changed
      let termsVersion = existing?.terms_version || 1
      if (
        (input.terms_dismantle !== undefined || input.terms_inland !== undefined) &&
        existing
      ) {
        termsVersion = (existing.terms_version || 0) + 1
      }

      const updates = {
        ...input,
        terms_version: termsVersion,
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        const { data, error } = await ctx.supabase
          .from('company_settings')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single()

        checkSupabaseError(error, 'Settings')
        return data
      } else {
        const { data, error } = await ctx.supabase
          .from('company_settings')
          .insert({
            ...updates,
            company_name: input.company_name || 'My Company',
            primary_color: input.primary_color || '#6366F1',
            logo_size_percentage: input.logo_size_percentage || 100,
            quote_validity_days: input.quote_validity_days || 30,
            default_margin_percentage: input.default_margin_percentage || 15,
            quote_prefix: input.quote_prefix || 'QT',
            default_payment_terms: input.default_payment_terms || 'Net 30',
            fuel_surcharge_enabled: false,
            fuel_surcharge_percentage: 0,
            doe_price_threshold: 0,
            email_notifications_enabled: true,
            terms_version: 1,
          })
          .select()
          .single()

        checkSupabaseError(error, 'Settings')
        return data
      }
    }),

  // Get terms & conditions
  getTerms: protectedProcedure
    .input(z.object({ type: z.enum(['dismantle', 'inland']) }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('company_settings')
        .select(`terms_${input.type}, terms_version`)
        .single()

      checkSupabaseError(error, 'Settings', true)
      const termsKey = `terms_${input.type}` as 'terms_dismantle' | 'terms_inland'
      return {
        content: (data as Record<string, unknown>)?.[termsKey] || null,
        version: data?.terms_version || 1,
      }
    }),

  // Update terms & conditions
  updateTerms: protectedProcedure
    .input(
      z.object({
        type: z.enum(['dismantle', 'inland']),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const field = `terms_${input.type}`

      // Get current version
      const { data: existing } = await ctx.supabase
        .from('company_settings')
        .select('id, terms_version')
        .single()

      const newVersion = (existing?.terms_version || 0) + 1

      if (existing) {
        const { data, error } = await ctx.supabase
          .from('company_settings')
          .update({
            [field]: input.content,
            terms_version: newVersion,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()

        checkSupabaseError(error, 'Settings')
        return { success: true, version: newVersion }
      } else {
        const { error } = await ctx.supabase
          .from('company_settings')
          .insert({
            company_name: 'My Company',
            primary_color: '#6366F1',
            logo_size_percentage: 100,
            quote_validity_days: 30,
            default_margin_percentage: 15,
            quote_prefix: 'QT',
            default_payment_terms: 'Net 30',
            fuel_surcharge_enabled: false,
            fuel_surcharge_percentage: 0,
            doe_price_threshold: 0,
            email_notifications_enabled: true,
            [field]: input.content,
            terms_version: 1,
          })

        checkSupabaseError(error, 'Settings')
        return { success: true, version: 1 }
      }
    }),

  // Get popular makes list
  getPopularMakes: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('company_settings')
      .select('popular_makes')
      .single()

    checkSupabaseError(error, 'Settings', true)

    // Return stored list or default
    const defaultMakes = [
      'Caterpillar', 'CAT', 'Komatsu', 'John Deere', 'Hitachi',
      'Volvo', 'Liebherr', 'Case', 'Kobelco', 'Doosan',
      'JCB', 'Kubota', 'Bobcat', 'Terex', 'Hyundai'
    ]
    return data?.popular_makes || defaultMakes
  }),

  // Update popular makes list
  updatePopularMakes: protectedProcedure
    .input(z.object({ makes: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const { data: existing } = await ctx.supabase
        .from('company_settings')
        .select('id')
        .single()

      if (existing) {
        const { error } = await ctx.supabase
          .from('company_settings')
          .update({
            popular_makes: input.makes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        checkSupabaseError(error, 'Settings')
      } else {
        const { error } = await ctx.supabase
          .from('company_settings')
          .insert({
            company_name: 'My Company',
            primary_color: '#6366F1',
            logo_size_percentage: 100,
            quote_validity_days: 30,
            default_margin_percentage: 15,
            quote_prefix: 'QT',
            default_payment_terms: 'Net 30',
            fuel_surcharge_enabled: false,
            fuel_surcharge_percentage: 0,
            doe_price_threshold: 0,
            email_notifications_enabled: true,
            terms_version: 1,
            popular_makes: input.makes,
          })

        checkSupabaseError(error, 'Settings')
      }

      return { success: true }
    }),
})
