import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '../trpc/trpc'
import { checkSupabaseError, assertDataExists } from '@/lib/errors'

const rateDataSchema = z.object({
  // For dismantle quotes
  base_rate: z.number().optional(),
  per_unit_rates: z.record(z.string(), z.number()).optional(),
  discounts: z.array(z.object({
    name: z.string(),
    type: z.enum(['percent', 'fixed']),
    value: z.number(),
    condition: z.string().optional(),
  })).optional(),
  // For inland quotes
  per_mile_rate: z.number().optional(),
  min_charge: z.number().optional(),
  fuel_surcharge_percent: z.number().optional(),
  accessorials: z.record(z.string(), z.number()).optional(),
})

export const rateCardsRouter = router({
  // Get all rate cards for a company
  getByCompany: protectedProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('company_rate_cards')
        .select('*')
        .eq('company_id', input.companyId)
        .order('created_at', { ascending: false })

      checkSupabaseError(error, 'Rate Card')
      return data || []
    }),

  // Get a single rate card
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('company_rate_cards')
        .select(`
          *,
          company:companies(id, name)
        `)
        .eq('id', input.id)
        .single()

      checkSupabaseError(error, 'Rate Card')
      assertDataExists(data, 'Rate Card')
      return data
    }),

  // Get active rate card for a company and type
  getActiveForCompany: protectedProcedure
    .input(z.object({
      companyId: z.string().uuid(),
      rateType: z.enum(['dismantle', 'inland']),
    }))
    .query(async ({ ctx, input }) => {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await ctx.supabase
        .from('company_rate_cards')
        .select('*')
        .eq('company_id', input.companyId)
        .eq('rate_type', input.rateType)
        .or(`effective_from.is.null,effective_from.lte.${today}`)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found is OK
        checkSupabaseError(error, 'Rate Card')
      }

      return data || null
    }),

  // Create a rate card - Manager or Admin only
  create: managerProcedure
    .input(z.object({
      company_id: z.string().uuid(),
      rate_type: z.enum(['dismantle', 'inland']),
      name: z.string().min(1),
      description: z.string().optional(),
      rate_data: rateDataSchema,
      is_default: z.boolean().default(false),
      effective_from: z.string().optional(),
      effective_to: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // If setting as default, unset other defaults
      if (input.is_default) {
        await ctx.supabase
          .from('company_rate_cards')
          .update({ is_default: false })
          .eq('company_id', input.company_id)
          .eq('rate_type', input.rate_type)
      }

      const { data, error } = await ctx.supabase
        .from('company_rate_cards')
        .insert({
          ...input,
          created_by: ctx.user.id,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Rate Card')

      // Log the rate card creation activity
      await ctx.adminSupabase.from('activity_logs').insert({
        company_id: input.company_id,
        user_id: ctx.user.id,
        activity_type: 'rate_card_updated',
        subject: `Rate card "${input.name}" created`,
        description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} created ${input.rate_type} rate card "${input.name}"`.trim(),
        metadata: {
          rate_card_id: data?.id,
          rate_type: input.rate_type,
          is_default: input.is_default,
        },
      })

      return data
    }),

  // Update a rate card - Manager or Admin only
  update: managerProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      rate_data: rateDataSchema.optional(),
      is_default: z.boolean().optional(),
      effective_from: z.string().optional(),
      effective_to: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      // Get current rate card to know company/type
      const { data: current, error: fetchError } = await ctx.supabase
        .from('company_rate_cards')
        .select('company_id, rate_type')
        .eq('id', id)
        .single()

      checkSupabaseError(fetchError, 'Rate Card')
      assertDataExists(current, 'Rate Card')

      // If setting as default, unset other defaults
      if (updates.is_default) {
        await ctx.supabase
          .from('company_rate_cards')
          .update({ is_default: false })
          .eq('company_id', current.company_id)
          .eq('rate_type', current.rate_type)
          .neq('id', id)
      }

      const { data, error } = await ctx.supabase
        .from('company_rate_cards')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      checkSupabaseError(error, 'Rate Card')

      // Log the rate card update activity
      if (data) {
        await ctx.adminSupabase.from('activity_logs').insert({
          company_id: current.company_id,
          user_id: ctx.user.id,
          activity_type: 'rate_card_updated',
          subject: `Rate card "${data.name}" updated`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} updated ${current.rate_type} rate card "${data.name}"`.trim(),
          metadata: {
            rate_card_id: data.id,
            rate_type: current.rate_type,
            updated_fields: Object.keys(updates),
          },
        })
      }

      return data
    }),

  // Delete a rate card - Manager or Admin only
  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get rate card info before deleting for logging
      const { data: rateCard } = await ctx.supabase
        .from('company_rate_cards')
        .select('name, company_id, rate_type')
        .eq('id', input.id)
        .single()

      const { error } = await ctx.supabase
        .from('company_rate_cards')
        .delete()
        .eq('id', input.id)

      checkSupabaseError(error, 'Rate Card')

      // Log the rate card deletion activity
      if (rateCard) {
        await ctx.adminSupabase.from('activity_logs').insert({
          company_id: rateCard.company_id,
          user_id: ctx.user.id,
          activity_type: 'rate_card_updated',
          subject: `Rate card "${rateCard.name}" deleted`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} deleted ${rateCard.rate_type} rate card "${rateCard.name}"`.trim(),
          metadata: {
            rate_type: rateCard.rate_type,
            action: 'deleted',
          },
        })
      }

      return { success: true }
    }),

  // Duplicate a rate card - Manager or Admin only
  duplicate: managerProcedure
    .input(z.object({
      id: z.string().uuid(),
      newCompanyId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get source rate card
      const { data: source, error: fetchError } = await ctx.supabase
        .from('company_rate_cards')
        .select('*')
        .eq('id', input.id)
        .single()

      checkSupabaseError(fetchError, 'Rate Card')
      assertDataExists(source, 'Rate Card')

      // Create duplicate
      const { data, error } = await ctx.supabase
        .from('company_rate_cards')
        .insert({
          company_id: input.newCompanyId || source.company_id,
          rate_type: source.rate_type,
          name: `${source.name} (Copy)`,
          description: source.description,
          rate_data: source.rate_data,
          is_default: false,
          effective_from: null,
          effective_to: null,
          created_by: ctx.user.id,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Rate Card')
      return data
    }),

  // Get all companies with rate cards
  getCompaniesWithRateCards: protectedProcedure
    .input(z.object({
      rateType: z.enum(['dismantle', 'inland']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('company_rate_cards')
        .select(`
          company_id,
          rate_type,
          company:companies(id, name)
        `)

      if (input?.rateType) {
        query = query.eq('rate_type', input.rateType)
      }

      const { data, error } = await query

      checkSupabaseError(error, 'Rate Card')

      // Group by company
      const companiesMap = new Map<string, { id: string; name: string; hasDismantle: boolean; hasInland: boolean }>()

      ;(data || []).forEach(rc => {
        const companyRaw = rc.company as { id: string; name: string } | { id: string; name: string }[] | null
        const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw
        if (!company) return

        if (!companiesMap.has(company.id)) {
          companiesMap.set(company.id, {
            id: company.id,
            name: company.name,
            hasDismantle: false,
            hasInland: false,
          })
        }

        const entry = companiesMap.get(company.id)!
        if (rc.rate_type === 'dismantle') entry.hasDismantle = true
        if (rc.rate_type === 'inland') entry.hasInland = true
      })

      return Array.from(companiesMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    }),
})
