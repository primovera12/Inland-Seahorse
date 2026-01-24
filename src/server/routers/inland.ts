import { z } from 'zod'
import { router, protectedProcedure, managerProcedure, adminProcedure, rateLimitedProcedure } from '../trpc/trpc'
import { generateInlandQuoteNumber } from '@/lib/utils'
import { checkSupabaseError, assertDataExists } from '@/lib/errors'

const inlandQuoteDataSchema = z.object({
  quote_number: z.string(),
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']),
  customer_name: z.string(),
  customer_email: z.string().email().or(z.literal('')).transform(val => val === '' ? undefined : val).optional(),
  customer_phone: z.string().optional(),
  customer_company: z.string().optional(),
  company_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  subtotal: z.number(),
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

  // Create equipment type (admin only)
  createEquipmentType: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        max_length_inches: z.number().min(0),
        max_width_inches: z.number().min(0),
        max_height_inches: z.number().min(0),
        max_weight_lbs: z.number().min(0).optional(),
        base_rate_cents: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the max sort_order to add at end
      const { data: existing } = await ctx.supabase
        .from('inland_equipment_types')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)

      const nextSortOrder = (existing?.[0]?.sort_order || 0) + 1

      const { data, error } = await ctx.supabase
        .from('inland_equipment_types')
        .insert({
          ...input,
          sort_order: nextSortOrder,
          is_active: true,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Equipment type')

      // Log equipment type creation
      if (data) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'inland_settings_updated',
          subject: `Inland equipment type "${input.name}" created`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} added new inland equipment type "${input.name}"`.trim(),
          metadata: { equipment_type_id: data.id, equipment_type_name: input.name, action: 'create' },
        })
      }

      return data
    }),

  // Update equipment type (admin only)
  updateEquipmentType: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        max_length_inches: z.number().min(0).optional(),
        max_width_inches: z.number().min(0).optional(),
        max_height_inches: z.number().min(0).optional(),
        max_weight_lbs: z.number().min(0).nullable().optional(),
        base_rate_cents: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input
      const { data, error } = await ctx.supabase
        .from('inland_equipment_types')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      checkSupabaseError(error, 'Equipment type')

      // Log equipment type update
      if (data) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'inland_settings_updated',
          subject: `Inland equipment type "${data.name}" updated`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} updated inland equipment type "${data.name}"`.trim(),
          metadata: { equipment_type_id: data.id, equipment_type_name: data.name, action: 'update', updated_fields: Object.keys(updateData) },
        })
      }

      return data
    }),

  // Delete equipment type (soft delete by setting is_active to false) - Admin only
  deleteEquipmentType: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get equipment type info before deletion for logging
      const { data: equipmentType } = await ctx.supabase
        .from('inland_equipment_types')
        .select('name')
        .eq('id', input.id)
        .single()

      const { error } = await ctx.supabase
        .from('inland_equipment_types')
        .update({ is_active: false })
        .eq('id', input.id)

      checkSupabaseError(error, 'Equipment type')

      // Log equipment type deletion
      if (equipmentType) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'inland_settings_updated',
          subject: `Inland equipment type "${equipmentType.name}" deleted`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} deleted inland equipment type "${equipmentType.name}"`.trim(),
          metadata: { equipment_type_name: equipmentType.name, action: 'delete' },
        })
      }

      return { success: true }
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

  // Get load types (cargo types)
  getLoadTypes: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('inland_load_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    // If table doesn't exist or no data, return empty array (not an error)
    if (error && error.code === '42P01') {
      return []
    }
    if (error) {
      checkSupabaseError(error, 'Load types')
    }
    return data || []
  }),

  // Create load type (admin only)
  createLoadType: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        default_length_inches: z.number().min(0).optional(),
        default_width_inches: z.number().min(0).optional(),
        default_height_inches: z.number().min(0).optional(),
        default_weight_lbs: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the max sort_order to add at end
      const { data: existing } = await ctx.supabase
        .from('inland_load_types')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)

      const nextSortOrder = (existing?.[0]?.sort_order || 0) + 1

      const { data, error } = await ctx.supabase
        .from('inland_load_types')
        .insert({
          ...input,
          sort_order: nextSortOrder,
          is_active: true,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Load type')
      return data
    }),

  // Get service types
  getServiceTypes: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('inland_service_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    // If table doesn't exist or no data, return empty array (not an error)
    if (error && error.code === '42P01') {
      return []
    }
    if (error) {
      checkSupabaseError(error, 'Service types')
    }
    return data || []
  }),

  // Create service type (admin only)
  createServiceType: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        default_rate_cents: z.number().min(0).optional(),
        billing_unit: z.enum(['flat', 'hour', 'day', 'mile', 'load', 'way']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the max sort_order to add at end
      const { data: existing } = await ctx.supabase
        .from('inland_service_types')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)

      const nextSortOrder = (existing?.[0]?.sort_order || 0) + 1

      const { data, error } = await ctx.supabase
        .from('inland_service_types')
        .insert({
          ...input,
          sort_order: nextSortOrder,
          is_active: true,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Service type')

      // Log service type creation
      if (data) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'inland_settings_updated',
          subject: `Inland service type "${input.name}" created`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} added new inland service type "${input.name}"`.trim(),
          metadata: { service_type_id: data.id, service_type_name: input.name, action: 'create' },
        })
      }

      return data
    }),

  // Update service type (admin only)
  updateServiceType: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        default_rate_cents: z.number().min(0).optional(),
        billing_unit: z.enum(['flat', 'hour', 'day', 'mile', 'load', 'way']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input
      const { data, error } = await ctx.supabase
        .from('inland_service_types')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      checkSupabaseError(error, 'Service type')

      // Log service type update
      if (data) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'inland_settings_updated',
          subject: `Inland service type "${data.name}" updated`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} updated inland service type "${data.name}"`.trim(),
          metadata: { service_type_id: data.id, service_type_name: data.name, action: 'update', updated_fields: Object.keys(updateData) },
        })
      }

      return data
    }),

  // Delete service type (soft delete by setting is_active to false) - Admin only
  deleteServiceType: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get service type info before deletion for logging
      const { data: serviceType } = await ctx.supabase
        .from('inland_service_types')
        .select('name')
        .eq('id', input.id)
        .single()

      const { error } = await ctx.supabase
        .from('inland_service_types')
        .update({ is_active: false })
        .eq('id', input.id)

      checkSupabaseError(error, 'Service type')

      // Log service type deletion
      if (serviceType) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'inland_settings_updated',
          subject: `Inland service type "${serviceType.name}" deleted`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} deleted inland service type "${serviceType.name}"`.trim(),
          metadata: { service_type_name: serviceType.name, action: 'delete' },
        })
      }

      return { success: true }
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
          .nullish(),
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
          is_latest_version,
          created_by,
          creator:users!created_by(id, first_name, last_name)
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

      // Transform to include created_by_name for display
      // Note: creator is a single object from the foreign key join
      const quotesWithCreator = data?.map((q) => {
        const creator = Array.isArray(q.creator) ? q.creator[0] : q.creator
        return {
          ...q,
          created_by_name: creator
            ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || 'Unknown'
            : 'System',
        }
      }) || []

      return { quotes: quotesWithCreator, total: count }
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

  // Get quote with company settings for PDF download
  getForDownload: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inland_quotes')
        .select('*')
        .eq('id', input.id)
        .single()

      checkSupabaseError(error, 'Inland quote')

      // Fetch company settings for PDF generation
      const { data: settings } = await ctx.supabase
        .from('company_settings')
        .select('*')
        .single()

      return {
        ...data,
        company_settings: settings || null,
      }
    }),

  // Get quote by public token (public endpoint for customers) - rate limited
  getByPublicToken: rateLimitedProcedure.publicQuoteRead
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inland_quotes')
        .select('*')
        .eq('public_token', input.token)
        .single()

      if (error || !data) {
        return null
      }

      // Mark as viewed if it was sent (customer is viewing it)
      if (data.status === 'sent') {
        await ctx.supabase
          .from('inland_quotes')
          .update({
            status: 'viewed',
            viewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id)

        // Record status change
        await ctx.supabase.from('quote_status_history').insert({
          quote_id: data.id,
          quote_type: 'inland',
          previous_status: 'sent',
          new_status: 'viewed',
          changed_by: null,
          changed_by_name: 'Customer',
          notes: 'Viewed via public link',
        })

        data.status = 'viewed'
      }

      // Fetch company settings for displaying full quote
      const { data: settings } = await ctx.supabase
        .from('company_settings')
        .select('*')
        .single()

      return {
        ...data,
        company_settings: settings || null,
      }
    }),

  // Get public link for a quote
  getPublicLink: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inland_quotes')
        .select('public_token')
        .eq('id', input.id)
        .single()

      checkSupabaseError(error, 'Inland quote')

      // Auto-generate token if it doesn't exist (for migrated quotes)
      if (!data?.public_token) {
        const newToken = crypto.randomUUID()
        const { error: updateError } = await ctx.supabase
          .from('inland_quotes')
          .update({ public_token: newToken })
          .eq('id', input.id)

        if (updateError) {
          throw new Error('Failed to generate public token')
        }
        return { token: newToken }
      }

      return { token: data.public_token }
    }),

  // Regenerate public token for a quote
  regeneratePublicToken: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inland_quotes')
        .update({ public_token: crypto.randomUUID() })
        .eq('id', input.id)
        .select('public_token')
        .single()

      checkSupabaseError(error, 'Inland quote')
      return { token: data?.public_token }
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

      // Log inland quote creation activity
      if (data) {
        await ctx.adminSupabase.from('activity_logs').insert({
          company_id: input.company_id || null,
          contact_id: input.contact_id || null,
          user_id: ctx.user.id,
          activity_type: 'inland_quote_created',
          subject: `Inland Quote ${data.quote_number} created`,
          description: `Created inland transport quote for ${input.customer_name}`,
          related_inland_quote_id: data.id,
          metadata: { status: 'draft', total: input.total, customer_name: input.customer_name },
        })
      }

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

      // Log quote update activity
      if (data) {
        await ctx.adminSupabase.from('activity_logs').insert({
          company_id: data.company_id || null,
          user_id: ctx.user.id,
          activity_type: 'inland_quote_updated',
          subject: `Inland Quote ${data.quote_number} updated`,
          description: `Updated inland transport quote for ${data.customer_name}`,
          related_inland_quote_id: data.id,
          metadata: { updated_fields: Object.keys(input.data) },
        })
      }

      return data
    }),

  // Delete quote - Manager or Admin only
  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get quote info before deletion for logging
      const { data: quoteToDelete } = await ctx.supabase
        .from('inland_quotes')
        .select('quote_number, company_id, customer_name')
        .eq('id', input.id)
        .single()

      const { error } = await ctx.supabase
        .from('inland_quotes')
        .delete()
        .eq('id', input.id)

      checkSupabaseError(error, 'Inland quote')

      // Log quote deletion
      if (quoteToDelete) {
        await ctx.adminSupabase.from('activity_logs').insert({
          company_id: quoteToDelete.company_id || null,
          user_id: ctx.user.id,
          activity_type: 'inland_quote_deleted',
          subject: `Inland Quote ${quoteToDelete.quote_number} deleted`,
          description: `Deleted inland transport quote for ${quoteToDelete.customer_name}`,
          metadata: { customer_name: quoteToDelete.customer_name },
        })
      }

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
        const { error: historyError } = await ctx.supabase.from('quote_status_history').insert({
          quote_id: input.id,
          quote_type: 'inland',
          previous_status: currentQuote?.status || null,
          new_status: input.status,
          changed_by: ctx.user.id,
          changed_by_name: changedByName,
          notes: input.notes,
        })

        // Log but don't fail the request if history insert fails
        if (historyError) {
          console.error('Failed to record status history:', historyError)
        }
      }

      return data
    }),

  // Mark as sent
  markAsSent: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get current quote for history and company_id for activity logging
      const { data: currentQuote } = await ctx.supabase
        .from('inland_quotes')
        .select('status, company_id, quote_number')
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

        // Log activity if linked to a company
        if (currentQuote?.company_id) {
          await ctx.adminSupabase.from('activity_logs').insert({
            company_id: currentQuote.company_id,
            user_id: ctx.user.id,
            activity_type: 'quote_sent',
            subject: `Quote ${currentQuote.quote_number} sent`,
            description: 'Inland quote marked as sent (PDF downloaded)',
            related_inland_quote_id: input.id,
            metadata: { previous_status: currentQuote.status, new_status: 'sent' },
          })
        }
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

      // Log the revision creation activity
      await ctx.adminSupabase.from('activity_logs').insert({
        user_id: ctx.user.id,
        company_id: sourceQuote.company_id || null,
        activity_type: 'inland_quote_created',
        subject: `Inland quote revision ${newQuoteNumber} created`,
        description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} created revision ${newVersion} of inland quote from ${sourceQuote.quote_number}`.trim(),
        related_inland_quote_id: newQuote.id,
        metadata: {
          quote_number: newQuoteNumber,
          version: newVersion,
          source_quote_number: sourceQuote.quote_number,
          action: 'revision',
        },
      })

      return newQuote
    }),

  // Clone a quote (create independent copy with new quote number)
  clone: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get the source quote
      const { data: sourceQuote, error: fetchError } = await ctx.supabase
        .from('inland_quotes')
        .select('*')
        .eq('id', input.id)
        .single()

      checkSupabaseError(fetchError, 'Inland quote')
      assertDataExists(sourceQuote, 'Source quote')

      // Generate new quote number
      const newQuoteNumber = generateInlandQuoteNumber()

      // Create the cloned quote (independent, not a revision)
      const { data: clonedQuote, error: createError } = await ctx.supabase
        .from('inland_quotes')
        .insert({
          // Copy core data
          customer_name: sourceQuote.customer_name,
          customer_email: sourceQuote.customer_email,
          customer_phone: sourceQuote.customer_phone,
          customer_company: sourceQuote.customer_company,
          company_id: sourceQuote.company_id,
          contact_id: sourceQuote.contact_id,
          // Copy location data
          origin_address: sourceQuote.origin_address,
          origin_city: sourceQuote.origin_city,
          origin_state: sourceQuote.origin_state,
          origin_zip: sourceQuote.origin_zip,
          origin_place_id: sourceQuote.origin_place_id,
          destination_address: sourceQuote.destination_address,
          destination_city: sourceQuote.destination_city,
          destination_state: sourceQuote.destination_state,
          destination_zip: sourceQuote.destination_zip,
          destination_place_id: sourceQuote.destination_place_id,
          distance_miles: sourceQuote.distance_miles,
          // Copy pricing data
          subtotal: sourceQuote.subtotal,
          margin_percentage: sourceQuote.margin_percentage,
          margin_amount: sourceQuote.margin_amount,
          total: sourceQuote.total,
          // Copy quote data (equipment, accessorials, etc.)
          quote_data: sourceQuote.quote_data,
          notes: sourceQuote.notes,
          // New quote metadata
          quote_number: newQuoteNumber,
          status: 'draft',
          version: 1,
          parent_quote_id: null, // Independent quote, not a revision
          is_latest_version: true,
          created_by: ctx.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Reset timestamps
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
        quote_id: clonedQuote.id,
        quote_type: 'inland',
        previous_status: null,
        new_status: 'draft',
        changed_by: ctx.user.id,
        notes: `Cloned from ${sourceQuote.quote_number}`,
      })

      // Log the clone activity
      await ctx.adminSupabase.from('activity_logs').insert({
        user_id: ctx.user.id,
        company_id: sourceQuote.company_id || null,
        activity_type: 'inland_quote_created',
        subject: `Inland quote ${newQuoteNumber} cloned`,
        description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} cloned inland quote from ${sourceQuote.quote_number} to ${newQuoteNumber}`.trim(),
        related_inland_quote_id: clonedQuote.id,
        metadata: {
          quote_number: newQuoteNumber,
          source_quote_number: sourceQuote.quote_number,
          action: 'clone',
        },
      })

      return clonedQuote
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

  // Get attachments for an inland quote
  getAttachments: protectedProcedure
    .input(z.object({ quoteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('quote_attachments')
        .select('*')
        .eq('inland_quote_id', input.quoteId)
        .order('uploaded_at', { ascending: false })

      checkSupabaseError(error, 'Attachment')
      return data || []
    }),

  // Add attachment metadata (file is uploaded directly to storage via client)
  addAttachment: protectedProcedure
    .input(
      z.object({
        quoteId: z.string().uuid(),
        fileName: z.string(),
        filePath: z.string(),
        fileSize: z.number(),
        fileType: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('quote_attachments')
        .insert({
          inland_quote_id: input.quoteId,
          file_name: input.fileName,
          file_path: input.filePath,
          file_size: input.fileSize,
          file_type: input.fileType,
          description: input.description,
          uploaded_by: ctx.user.id,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Attachment')
      return data
    }),

  // Delete attachment
  deleteAttachment: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get attachment to delete file from storage
      const { data: attachment } = await ctx.supabase
        .from('quote_attachments')
        .select('file_path')
        .eq('id', input.id)
        .single()

      if (attachment?.file_path) {
        // Delete from storage
        await ctx.supabase.storage
          .from('quote-attachments')
          .remove([attachment.file_path])
      }

      // Delete from database
      const { error } = await ctx.supabase
        .from('quote_attachments')
        .delete()
        .eq('id', input.id)

      checkSupabaseError(error, 'Attachment')
      return { success: true }
    }),

  // Get signed URL for downloading attachment
  getAttachmentUrl: protectedProcedure
    .input(z.object({ filePath: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.storage
        .from('quote-attachments')
        .createSignedUrl(input.filePath, 3600) // 1 hour expiry

      if (error) {
        throw new Error('Failed to generate download URL')
      }

      return { url: data.signedUrl }
    }),

  // Batch update status
  batchUpdateStatus: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1).max(100),
        status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {
        status: input.status,
        updated_at: new Date().toISOString(),
      }

      // Set appropriate timestamp based on status
      if (input.status === 'sent') {
        updateData.sent_at = new Date().toISOString()
        // Set expiration
        const { data: settings } = await ctx.supabase
          .from('company_settings')
          .select('quote_validity_days')
          .single()
        const validityDays = settings?.quote_validity_days || 30
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + validityDays)
        updateData.expires_at = expiresAt.toISOString()
      } else if (input.status === 'accepted') {
        updateData.accepted_at = new Date().toISOString()
      } else if (input.status === 'rejected') {
        updateData.rejected_at = new Date().toISOString()
      }

      const { error } = await ctx.supabase
        .from('inland_quotes')
        .update(updateData)
        .in('id', input.ids)

      checkSupabaseError(error, 'Quote')

      // Log the bulk status update activity
      await ctx.adminSupabase.from('activity_logs').insert({
        user_id: ctx.user.id,
        activity_type: 'bulk_operation',
        subject: `Bulk status update: ${input.ids.length} inland quote(s) → ${input.status}`,
        description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} changed status of ${input.ids.length} inland quote(s) to ${input.status}`.trim(),
        metadata: {
          operation: 'bulk_status_update',
          quote_type: 'inland',
          count: input.ids.length,
          new_status: input.status,
        },
      })

      return { success: true, updated: input.ids.length }
    }),

  // Batch delete quotes - Manager or Admin only
  batchDelete: managerProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get quote info before deletion for logging
      const { data: quotesToDelete } = await ctx.supabase
        .from('inland_quotes')
        .select('quote_number, customer_name')
        .in('id', input.ids)

      const { error } = await ctx.supabase
        .from('inland_quotes')
        .delete()
        .in('id', input.ids)

      checkSupabaseError(error, 'Quote')

      // Log the bulk deletion activity
      const quoteNumbers = quotesToDelete?.map(q => q.quote_number).join(', ') || 'Unknown'
      await ctx.adminSupabase.from('activity_logs').insert({
        user_id: ctx.user.id,
        activity_type: 'bulk_operation',
        subject: `Bulk delete: ${input.ids.length} inland quote(s)`,
        description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} deleted ${input.ids.length} inland quote(s): ${quoteNumbers}`.trim(),
        metadata: {
          operation: 'bulk_delete',
          quote_type: 'inland',
          count: input.ids.length,
          quote_numbers: quotesToDelete?.map(q => q.quote_number) || [],
        },
      })

      return { success: true, deleted: input.ids.length }
    }),

  // Public endpoint to accept a quote with signature - rate limited
  publicAccept: rateLimitedProcedure.publicQuoteAction
    .input(
      z.object({
        token: z.string().uuid(),
        signatureData: z.string().optional(),
        signedBy: z.string().min(1),
        signerEmail: z.string().email().or(z.literal('')).transform(val => val === '' ? undefined : val).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the quote by token
      const { data: quote, error: fetchError } = await ctx.supabase
        .from('inland_quotes')
        .select('id, status, quote_number')
        .eq('public_token', input.token)
        .single()

      if (fetchError || !quote) {
        throw new Error('Quote not found')
      }

      // Check if quote can be accepted
      if (quote.status !== 'sent' && quote.status !== 'viewed') {
        throw new Error('This quote cannot be accepted in its current state')
      }

      const now = new Date().toISOString()

      // Update the quote
      const { error: updateError } = await ctx.supabase
        .from('inland_quotes')
        .update({
          status: 'accepted',
          signature_data: input.signatureData,
          signed_by: input.signedBy,
          signed_at: now,
          accepted_at: now,
          updated_at: now,
        })
        .eq('id', quote.id)

      if (updateError) {
        throw new Error('Failed to accept quote')
      }

      // Record the response
      await ctx.supabase.from('quote_responses').insert({
        inland_quote_id: quote.id,
        response_type: 'accepted',
        signature_data: input.signatureData,
        signed_by: input.signedBy,
        signer_email: input.signerEmail,
        notes: input.notes,
      })

      // Record status change
      await ctx.supabase.from('quote_status_history').insert({
        inland_quote_id: quote.id,
        quote_type: 'inland',
        previous_status: quote.status,
        new_status: 'accepted',
        changed_by: null,
        changed_by_name: input.signedBy,
        notes: 'Accepted via public link with signature',
      })

      return { success: true, quoteNumber: quote.quote_number }
    }),

  // Public endpoint to reject a quote - rate limited
  publicReject: rateLimitedProcedure.publicQuoteAction
    .input(
      z.object({
        token: z.string().uuid(),
        rejectionReason: z.string().optional(),
        respondentName: z.string().optional(),
        respondentEmail: z.string().email().or(z.literal('')).transform(val => val === '' ? undefined : val).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the quote by token
      const { data: quote, error: fetchError } = await ctx.supabase
        .from('inland_quotes')
        .select('id, status, quote_number')
        .eq('public_token', input.token)
        .single()

      if (fetchError || !quote) {
        throw new Error('Quote not found')
      }

      // Check if quote can be rejected
      if (quote.status !== 'sent' && quote.status !== 'viewed') {
        throw new Error('This quote cannot be rejected in its current state')
      }

      const now = new Date().toISOString()

      // Update the quote
      const { error: updateError } = await ctx.supabase
        .from('inland_quotes')
        .update({
          status: 'rejected',
          rejection_reason: input.rejectionReason,
          rejected_at: now,
          updated_at: now,
        })
        .eq('id', quote.id)

      if (updateError) {
        throw new Error('Failed to reject quote')
      }

      // Record the response
      await ctx.supabase.from('quote_responses').insert({
        inland_quote_id: quote.id,
        response_type: 'rejected',
        signed_by: input.respondentName,
        signer_email: input.respondentEmail,
        rejection_reason: input.rejectionReason,
      })

      // Record status change
      await ctx.supabase.from('quote_status_history').insert({
        inland_quote_id: quote.id,
        quote_type: 'inland',
        previous_status: quote.status,
        new_status: 'rejected',
        changed_by: null,
        changed_by_name: input.respondentName || 'Customer',
        notes: input.rejectionReason ? `Rejected: ${input.rejectionReason}` : 'Rejected via public link',
      })

      return { success: true, quoteNumber: quote.quote_number }
    }),
})
