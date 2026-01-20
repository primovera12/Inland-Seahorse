import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '../trpc/trpc'
import { checkSupabaseError, assertDataExists } from '@/lib/errors'

export const companiesRouter = router({
  // Get all companies
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z
          .enum(['active', 'inactive', 'prospect', 'lead', 'vip'])
          .optional(),
        search: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        industry: z.string().optional(),
        sortBy: z.enum(['name', 'created_at', 'city', 'state']).default('name'),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('companies')
        .select('*', { count: 'exact' })
        .order(input.sortBy, { ascending: input.sortOrder === 'asc' })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.status) {
        query = query.eq('status', input.status)
      }

      if (input.search) {
        query = query.ilike('name', `%${input.search}%`)
      }

      if (input.city) {
        query = query.ilike('city', `%${input.city}%`)
      }

      if (input.state) {
        query = query.ilike('state', `%${input.state}%`)
      }

      if (input.industry) {
        query = query.ilike('industry', `%${input.industry}%`)
      }

      const { data, error, count } = await query

      checkSupabaseError(error, 'Company')
      return { companies: data, total: count }
    }),

  // Get distinct values for filters
  getFilterOptions: protectedProcedure.query(async ({ ctx }) => {
    // Get distinct cities
    const { data: cities } = await ctx.supabase
      .from('companies')
      .select('city')
      .not('city', 'is', null)
      .not('city', 'eq', '')

    // Get distinct states
    const { data: states } = await ctx.supabase
      .from('companies')
      .select('state')
      .not('state', 'is', null)
      .not('state', 'eq', '')

    // Get distinct industries
    const { data: industries } = await ctx.supabase
      .from('companies')
      .select('industry')
      .not('industry', 'is', null)
      .not('industry', 'eq', '')

    const uniqueCities = [...new Set(cities?.map(c => c.city).filter(Boolean) || [])]
    const uniqueStates = [...new Set(states?.map(s => s.state).filter(Boolean) || [])]
    const uniqueIndustries = [...new Set(industries?.map(i => i.industry).filter(Boolean) || [])]

    return {
      cities: uniqueCities.sort(),
      states: uniqueStates.sort(),
      industries: uniqueIndustries.sort(),
    }
  }),

  // Get single company with contacts
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('companies')
        .select('*, contacts(*)')
        .eq('id', input.id)
        .single()

      checkSupabaseError(error, 'Company')
      assertDataExists(data, 'Company')
      return data
    }),

  // Create company
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        industry: z.string().optional(),
        website: z.string().url().or(z.literal('')).transform(val => val === '' ? undefined : val).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        billing_address: z.string().optional(),
        billing_city: z.string().optional(),
        billing_state: z.string().optional(),
        billing_zip: z.string().optional(),
        payment_terms: z.string().optional(),
        tax_id: z.string().optional(),
        tags: z.array(z.string()).optional(),
        status: z
          .enum(['active', 'inactive', 'prospect', 'lead', 'vip'])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('companies')
        .insert(input)
        .select()
        .single()

      checkSupabaseError(error, 'Company')

      // Auto-create placeholder primary contact for the new company
      if (data) {
        await ctx.supabase.from('contacts').insert({
          company_id: data.id,
          first_name: 'Primary',
          last_name: 'Contact',
          role: 'general',
          is_primary: true,
        })

        // Log company creation activity
        await ctx.adminSupabase.from('activity_logs').insert({
          company_id: data.id,
          user_id: ctx.user.id,
          activity_type: 'company_created',
          subject: `Company "${data.name}" created`,
          description: `Created new company: ${data.name}${data.industry ? ` (${data.industry})` : ''}`,
          metadata: { status: data.status, city: data.city, state: data.state },
        })
      }

      return data
    }),

  // Update company
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          name: z.string().min(1).optional(),
          industry: z.string().optional(),
          website: z.string().url().or(z.literal('')).transform(val => val === '' ? undefined : val).optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zip: z.string().optional(),
          billing_address: z.string().optional(),
          billing_city: z.string().optional(),
          billing_state: z.string().optional(),
          billing_zip: z.string().optional(),
          payment_terms: z.string().optional(),
          tax_id: z.string().optional(),
          tags: z.array(z.string()).optional(),
          status: z
            .enum(['active', 'inactive', 'prospect', 'lead', 'vip'])
            .optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('companies')
        .update(input.data)
        .eq('id', input.id)
        .select()
        .single()

      checkSupabaseError(error, 'Company')

      // Log company update activity
      if (data) {
        await ctx.adminSupabase.from('activity_logs').insert({
          company_id: data.id,
          user_id: ctx.user.id,
          activity_type: 'company_updated',
          subject: `Company "${data.name}" updated`,
          description: `Updated company information`,
          metadata: { updated_fields: Object.keys(input.data) },
        })
      }

      return data
    }),

  // Delete company (cascades to contacts) - Manager or Admin only
  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get company info before deletion for logging
      const { data: companyToDelete } = await ctx.supabase
        .from('companies')
        .select('name')
        .eq('id', input.id)
        .single()

      const { error } = await ctx.supabase
        .from('companies')
        .delete()
        .eq('id', input.id)

      checkSupabaseError(error, 'Company')

      // Log company deletion
      if (companyToDelete) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'company_updated',
          subject: `Company "${companyToDelete.name}" deleted`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} deleted company "${companyToDelete.name}" and all associated contacts`.trim(),
          metadata: { company_name: companyToDelete.name, action: 'delete' },
        })
      }

      return { success: true }
    }),

  // Search companies (for autocomplete)
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('companies')
        .select('id, name, phone, status, address, city, state, zip')
        .ilike('name', `%${input.query}%`)
        .eq('status', 'active')
        .limit(10)

      checkSupabaseError(error, 'Company')
      return data
    }),
})

export const contactsRouter = router({
  // Get contacts for a company
  getByCompany: protectedProcedure
    .input(
      z.object({
        companyId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error, count } = await ctx.supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .eq('company_id', input.companyId)
        .order('is_primary', { ascending: false })
        .order('last_name')
        .range(input.offset, input.offset + input.limit - 1)

      checkSupabaseError(error, 'Contact')
      return { contacts: data || [], total: count || 0 }
    }),

  // Create contact
  create: protectedProcedure
    .input(
      z.object({
        company_id: z.string().uuid(),
        first_name: z.string().min(1),
        last_name: z.string().min(1),
        email: z.string().email().or(z.literal('')).transform(val => val === '' ? undefined : val).optional(),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        title: z.string().optional(),
        role: z
          .enum(['general', 'decision_maker', 'billing', 'operations', 'technical'])
          .optional(),
        is_primary: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('contacts')
        .insert(input)
        .select()
        .single()

      checkSupabaseError(error, 'Contact')

      // Log contact creation activity
      if (data) {
        await ctx.adminSupabase.from('activity_logs').insert({
          company_id: data.company_id,
          contact_id: data.id,
          user_id: ctx.user.id,
          activity_type: 'contact_created',
          subject: `Contact "${data.first_name} ${data.last_name}" created`,
          description: `Added new contact: ${data.first_name} ${data.last_name}${data.title ? ` (${data.title})` : ''}`,
          metadata: { role: data.role, email: data.email },
        })
      }

      return data
    }),

  // Update contact
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          first_name: z.string().min(1).optional(),
          last_name: z.string().min(1).optional(),
          email: z.string().email().or(z.literal('')).transform(val => val === '' ? undefined : val).optional(),
          phone: z.string().optional(),
          mobile: z.string().optional(),
          title: z.string().optional(),
          role: z
            .enum(['general', 'decision_maker', 'billing', 'operations', 'technical'])
            .optional(),
          is_primary: z.boolean().optional(),
          notes: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('contacts')
        .update(input.data)
        .eq('id', input.id)
        .select()
        .single()

      checkSupabaseError(error, 'Contact')

      // Log contact update activity
      if (data) {
        await ctx.adminSupabase.from('activity_logs').insert({
          company_id: data.company_id,
          contact_id: data.id,
          user_id: ctx.user.id,
          activity_type: 'contact_updated',
          subject: `Contact "${data.first_name} ${data.last_name}" updated`,
          description: `Updated contact information`,
          metadata: { updated_fields: Object.keys(input.data) },
        })
      }

      return data
    }),

  // Delete contact - Manager or Admin only
  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('contacts')
        .delete()
        .eq('id', input.id)

      checkSupabaseError(error, 'Contact')
      return { success: true }
    }),
})
