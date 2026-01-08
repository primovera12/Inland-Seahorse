import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { generateInlandQuoteNumber } from '@/lib/utils'
import { checkSupabaseError, assertDataExists } from '@/lib/errors'

const inlandQuoteDataSchema = z.object({
  quote_number: z.string(),
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']),
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

    checkSupabaseError(error, 'Inland quote')
    return data
  }),

  // Get accessorial types
  getAccessorialTypes: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('inland_accessorial_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    checkSupabaseError(error, 'Inland quote')
    return data
  }),

  // Get rate tiers
  getRateTiers: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('inland_rate_tiers')
      .select('*')
      .eq('is_active', true)
      .order('min_miles')

    checkSupabaseError(error, 'Inland quote')
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
      checkSupabaseError(error, 'Inland quote')
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

      checkSupabaseError(error, 'Inland quote')
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

      checkSupabaseError(error, 'Inland rate', true)
      return data
    }),

  // Get quote history (optimized: select only list-view columns)
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z
          .enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('inland_quotes')
        .select(
          `
          id,
          quote_number,
          version,
          status,
          customer_name,
          customer_company,
          customer_email,
          origin_city,
          origin_state,
          destination_city,
          destination_state,
          total,
          expires_at,
          created_at,
          updated_at,
          is_latest_version
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.status) {
        query = query.eq('status', input.status)
      }

      const { data, error, count } = await query
      checkSupabaseError(error, 'Inland quote')
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

      checkSupabaseError(error, 'Inland quote')
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

      checkSupabaseError(error, 'Inland quote')
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

      checkSupabaseError(error, 'Inland quote')
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

      checkSupabaseError(error, 'Inland quote')
      return { success: true }
    }),

  // Generate new quote number
  generateNumber: protectedProcedure.query(async () => {
    return generateInlandQuoteNumber()
  }),

  // Update quote status with history tracking
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current quote to track previous status
      const { data: currentQuote } = await ctx.supabase
        .from('inland_quotes')
        .select('status, quote_number, customer_email, customer_name')
        .eq('id', input.id)
        .single()

      // Get user info for history
      const { data: userProfile } = await ctx.supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', ctx.user.id)
        .single()

      const changedByName = userProfile
        ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
        : undefined

      // Update the quote
      const updateData: Record<string, unknown> = {
        status: input.status,
        updated_at: new Date().toISOString(),
      }

      // Add timestamp for specific statuses
      if (input.status === 'viewed' && currentQuote?.status !== 'viewed') {
        updateData.viewed_at = new Date().toISOString()
      }

      const { data, error } = await ctx.supabase
        .from('inland_quotes')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single()

      checkSupabaseError(error, 'Inland quote')

      // Record status change in history
      if (currentQuote?.status !== input.status) {
        await ctx.supabase.from('quote_status_history').insert({
          quote_id: input.id,
          quote_type: 'inland',
          previous_status: currentQuote?.status || null,
          new_status: input.status,
          changed_by: ctx.user.id,
          changed_by_name: changedByName,
          notes: input.notes,
        })
      }

      return data
    }),

  // Mark as sent
  markAsSent: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get current quote for history
      const { data: currentQuote } = await ctx.supabase
        .from('inland_quotes')
        .select('status')
        .eq('id', input.id)
        .single()

      // Get quote validity from settings
      const { data: settings } = await ctx.supabase
        .from('company_settings')
        .select('quote_validity_days')
        .single()

      const validityDays = settings?.quote_validity_days || 30
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + validityDays)

      const { data, error } = await ctx.supabase
        .from('inland_quotes')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single()

      checkSupabaseError(error, 'Inland quote')

      // Record status history
      if (currentQuote?.status !== 'sent') {
        await ctx.supabase.from('quote_status_history').insert({
          quote_id: input.id,
          quote_type: 'inland',
          previous_status: currentQuote?.status || null,
          new_status: 'sent',
          changed_by: ctx.user.id,
        })
      }

      return data
    }),

  // Mark as viewed
  markAsViewed: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get current quote for history
      const { data: currentQuote } = await ctx.supabase
        .from('inland_quotes')
        .select('status')
        .eq('id', input.id)
        .single()

      // Only update if not already viewed or in a later state
      if (currentQuote?.status === 'sent') {
        const { data, error } = await ctx.supabase
          .from('inland_quotes')
          .update({
            status: 'viewed',
            viewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.id)
          .select()
          .single()

        checkSupabaseError(error, 'Inland quote')

        // Record status history
        await ctx.supabase.from('quote_status_history').insert({
          quote_id: input.id,
          quote_type: 'inland',
          previous_status: 'sent',
          new_status: 'viewed',
          changed_by: ctx.user.id,
        })

        return data
      }

      // Return current quote if already in a later state
      const { data } = await ctx.supabase
        .from('inland_quotes')
        .select('*')
        .eq('id', input.id)
        .single()

      return data
    }),

  // Mark as accepted
  markAsAccepted: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get current quote for history
      const { data: currentQuote } = await ctx.supabase
        .from('inland_quotes')
        .select('status, quote_number, customer_name')
        .eq('id', input.id)
        .single()

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

      checkSupabaseError(error, 'Inland quote')

      // Record status history
      if (currentQuote?.status !== 'accepted') {
        await ctx.supabase.from('quote_status_history').insert({
          quote_id: input.id,
          quote_type: 'inland',
          previous_status: currentQuote?.status || null,
          new_status: 'accepted',
          changed_by: ctx.user.id,
        })
      }

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
      // Get current quote for history
      const { data: currentQuote } = await ctx.supabase
        .from('inland_quotes')
        .select('status, quote_number, customer_name')
        .eq('id', input.id)
        .single()

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

      checkSupabaseError(error, 'Inland quote')

      // Record status history
      if (currentQuote?.status !== 'rejected') {
        await ctx.supabase.from('quote_status_history').insert({
          quote_id: input.id,
          quote_type: 'inland',
          previous_status: currentQuote?.status || null,
          new_status: 'rejected',
          changed_by: ctx.user.id,
          notes: input.rejection_reason,
        })
      }

      return data
    }),

  // Get status history for a quote
  getStatusHistory: protectedProcedure
    .input(z.object({ quoteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('quote_status_history')
        .select(`
          id,
          quote_id,
          quote_type,
          previous_status,
          new_status,
          changed_by,
          changed_by_name,
          notes,
          created_at
        `)
        .eq('quote_id', input.quoteId)
        .eq('quote_type', 'inland')
        .order('created_at', { ascending: false })

      checkSupabaseError(error, 'Inland quote')
      return data || []
    }),

  // Save draft
  saveDraft: protectedProcedure
    .input(z.object({ quote_data: z.record(z.string(), z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      // Check if user has an existing draft
      const { data: existing } = await ctx.supabase
        .from('inland_quote_drafts')
        .select('id')
        .eq('user_id', ctx.user.id)
        .single()

      if (existing) {
        // Update existing draft
        const { data, error } = await ctx.supabase
          .from('inland_quote_drafts')
          .update({
            quote_data: input.quote_data,
            last_saved_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()

        checkSupabaseError(error, 'Inland quote')
        return data
      } else {
        // Create new draft
        const { data, error } = await ctx.supabase
          .from('inland_quote_drafts')
          .insert({
            user_id: ctx.user.id,
            quote_data: input.quote_data,
          })
          .select()
          .single()

        checkSupabaseError(error, 'Inland quote')
        return data
      }
    }),

  // Get user's draft
  getDraft: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('inland_quote_drafts')
      .select('*')
      .eq('user_id', ctx.user.id)
      .single()

    checkSupabaseError(error, 'Inland quote', true)
    return data
  }),

  // Delete user's draft
  deleteDraft: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from('inland_quote_drafts')
      .delete()
      .eq('user_id', ctx.user.id)

    checkSupabaseError(error, 'Inland quote')
    return { success: true }
  }),

  // Create a new revision from an existing quote
  createRevision: protectedProcedure
    .input(
      z.object({
        sourceQuoteId: z.string().uuid(),
        changeNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the source quote
      const { data: sourceQuote, error: fetchError } = await ctx.supabase
        .from('inland_quotes')
        .select('*')
        .eq('id', input.sourceQuoteId)
        .single()

      checkSupabaseError(fetchError, 'Inland quote')
      assertDataExists(sourceQuote, 'Source quote')

      // Determine the parent quote ID (original in the chain)
      const parentQuoteId = sourceQuote.parent_quote_id || sourceQuote.id

      // Get the current max version for this quote chain
      const { data: versions } = await ctx.supabase
        .from('inland_quotes')
        .select('version')
        .or(`id.eq.${parentQuoteId},parent_quote_id.eq.${parentQuoteId}`)
        .order('version', { ascending: false })
        .limit(1)

      const newVersion = (versions?.[0]?.version || 1) + 1

      // Mark all previous versions as not latest
      await ctx.supabase
        .from('inland_quotes')
        .update({ is_latest_version: false })
        .or(`id.eq.${parentQuoteId},parent_quote_id.eq.${parentQuoteId}`)

      // Generate new quote number with version suffix
      const baseQuoteNumber = sourceQuote.quote_number.replace(/-v\d+$/, '')
      const newQuoteNumber = `${baseQuoteNumber}-v${newVersion}`

      // Create the new revision
      const { data: newQuote, error: createError } = await ctx.supabase
        .from('inland_quotes')
        .insert({
          ...sourceQuote,
          id: undefined, // Let DB generate new ID
          quote_number: newQuoteNumber,
          version: newVersion,
          parent_quote_id: parentQuoteId,
          is_latest_version: true,
          status: 'draft',
          change_notes: input.changeNotes,
          created_by: ctx.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sent_at: null,
          expires_at: null,
          accepted_at: null,
          rejected_at: null,
          viewed_at: null,
        })
        .select()
        .single()

      checkSupabaseError(createError, 'Inland quote')

      // Record in status history
      await ctx.supabase.from('quote_status_history').insert({
        quote_id: newQuote.id,
        quote_type: 'inland',
        previous_status: null,
        new_status: 'draft',
        changed_by: ctx.user.id,
        notes: `Revision ${newVersion} created from ${sourceQuote.quote_number}`,
      })

      return newQuote
    }),

  // Get all versions of a quote
  getVersions: protectedProcedure
    .input(z.object({ quoteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // First get the quote to find parent
      const { data: quote } = await ctx.supabase
        .from('inland_quotes')
        .select('id, parent_quote_id')
        .eq('id', input.quoteId)
        .single()

      if (!quote) return []

      const parentId = quote.parent_quote_id || quote.id

      // Get all versions with creator info in a single query
      const { data: versions, error } = await ctx.supabase
        .from('inland_quotes')
        .select(`
          id,
          quote_number,
          version,
          parent_quote_id,
          is_latest_version,
          status,
          total,
          change_notes,
          created_at,
          created_by,
          creator:users!created_by(id, first_name, last_name)
        `)
        .or(`id.eq.${parentId},parent_quote_id.eq.${parentId}`)
        .order('version', { ascending: false })

      checkSupabaseError(error, 'Inland quote')

      // Transform to include created_by_name
      return versions?.map(v => {
        const creator = v.creator as { first_name?: string; last_name?: string } | null
        return {
          id: v.id,
          quote_number: v.quote_number,
          version: v.version,
          parent_quote_id: v.parent_quote_id,
          is_latest_version: v.is_latest_version,
          status: v.status,
          total: v.total,
          change_notes: v.change_notes,
          created_at: v.created_at,
          created_by: v.created_by,
          created_by_name: creator
            ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim()
            : undefined,
        }
      }) || []
    }),

  // Compare two versions of a quote
  compareVersions: protectedProcedure
    .input(
      z.object({
        quoteId1: z.string().uuid(),
        quoteId2: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data: quotes, error } = await ctx.supabase
        .from('inland_quotes')
        .select('*')
        .in('id', [input.quoteId1, input.quoteId2])

      checkSupabaseError(error, 'Inland quote')
      if (!quotes || quotes.length !== 2) {
        throw new Error('Could not find both quotes')
      }

      const [quote1, quote2] = quotes.sort((a, b) => a.version - b.version)

      // Calculate differences
      const differences: Array<{
        field: string
        label: string
        oldValue: unknown
        newValue: unknown
      }> = []

      const fieldsToCompare = [
        { key: 'customer_name', label: 'Customer Name' },
        { key: 'customer_email', label: 'Customer Email' },
        { key: 'customer_company', label: 'Customer Company' },
        { key: 'origin_city', label: 'Origin City' },
        { key: 'origin_state', label: 'Origin State' },
        { key: 'destination_city', label: 'Destination City' },
        { key: 'destination_state', label: 'Destination State' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'margin_percentage', label: 'Margin %' },
        { key: 'total', label: 'Total' },
      ]

      fieldsToCompare.forEach(({ key, label }) => {
        const val1 = quote1[key]
        const val2 = quote2[key]
        if (JSON.stringify(val1) !== JSON.stringify(val2)) {
          differences.push({
            field: key,
            label,
            oldValue: val1,
            newValue: val2,
          })
        }
      })

      return {
        quote1: { id: quote1.id, version: quote1.version, quote_number: quote1.quote_number },
        quote2: { id: quote2.id, version: quote2.version, quote_number: quote2.quote_number },
        differences,
      }
    }),
})
