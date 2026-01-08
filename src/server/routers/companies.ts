import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'

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
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('companies')
        .select('*', { count: 'exact' })
        .order('name')
        .range(input.offset, input.offset + input.limit - 1)

      if (input.status) {
        query = query.eq('status', input.status)
      }

      if (input.search) {
        query = query.ilike('name', `%${input.search}%`)
      }

      const { data, error, count } = await query

      if (error) throw error
      return { companies: data, total: count }
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

      if (error) throw error
      return data
    }),

  // Create company
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        industry: z.string().optional(),
        website: z.string().url().optional(),
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

      if (error) throw error
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
          website: z.string().url().optional(),
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

      if (error) throw error
      return data
    }),

  // Search companies (for autocomplete)
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('companies')
        .select('id, name, phone, status')
        .ilike('name', `%${input.query}%`)
        .eq('status', 'active')
        .limit(10)

      if (error) throw error
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

      if (error) throw error
      return { contacts: data || [], total: count || 0 }
    }),

  // Create contact
  create: protectedProcedure
    .input(
      z.object({
        company_id: z.string().uuid(),
        first_name: z.string().min(1),
        last_name: z.string().min(1),
        email: z.string().email().optional(),
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

      if (error) throw error
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
          email: z.string().email().optional(),
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

      if (error) throw error
      return data
    }),
})
