import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { generateQuoteNumber } from '@/lib/utils'
import { Resend } from 'resend'
import { checkSupabaseError, assertDataExists } from '@/lib/errors'

// Lazy initialization to avoid build-time errors when API key is not set
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set')
  }
  return new Resend(apiKey)
}

const quoteDataSchema = z.object({
  quote_number: z.string(),
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']),
  customer_name: z.string(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().optional(),
  customer_company: z.string().optional(),
  customer_address: z.string().optional(),
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
  total: z.number(),
  quote_data: z.record(z.string(), z.unknown()),
})

export const quotesRouter = router({
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
        .from('quote_history')
        .select(
          `
          id,
          quote_number,
          version,
          status,
          customer_name,
          customer_company,
          customer_email,
          make_name,
          model_name,
          location,
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

      checkSupabaseError(error, 'Quote')
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

      checkSupabaseError(error, 'Quote')
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

      checkSupabaseError(error, 'Quote')
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

      checkSupabaseError(error, 'Quote')
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

      checkSupabaseError(error, 'Quote')
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
        .from('quote_history')
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
        .from('quote_history')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single()

      checkSupabaseError(error, 'Quote')

      // Record status change in history
      if (currentQuote?.status !== input.status) {
        await ctx.supabase.from('quote_status_history').insert({
          quote_id: input.id,
          quote_type: 'dismantle',
          previous_status: currentQuote?.status || null,
          new_status: input.status,
          changed_by: ctx.user.id,
          changed_by_name: changedByName,
          notes: input.notes,
        })

        // Send email notification for important status changes
        if (['accepted', 'rejected'].includes(input.status) && currentQuote?.customer_email) {
          try {
            await getResend().emails.send({
              from: 'Dismantle Pro <noreply@dismantlepro.com>',
              to: process.env.ADMIN_EMAIL || 'admin@example.com',
              subject: `Quote ${currentQuote.quote_number} ${input.status}`,
              html: `
                <h2>Quote Status Update</h2>
                <p><strong>Quote:</strong> ${currentQuote.quote_number}</p>
                <p><strong>Customer:</strong> ${currentQuote.customer_name}</p>
                <p><strong>New Status:</strong> ${input.status}</p>
                ${input.notes ? `<p><strong>Notes:</strong> ${input.notes}</p>` : ''}
              `,
            })
          } catch (emailError) {
            console.error('Failed to send status notification:', emailError)
          }
        }
      }

      return data
    }),

  // Get status history for a quote (optimized: specific columns + eager loading)
  getStatusHistory: protectedProcedure
    .input(
      z.object({
        quoteId: z.string().uuid(),
        quoteType: z.enum(['dismantle', 'inland']).default('dismantle'),
      })
    )
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
        .eq('quote_type', input.quoteType)
        .order('created_at', { ascending: false })

      checkSupabaseError(error, 'Quote')
      return data || []
    }),

  // Mark as sent
  markAsSent: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get current quote for history
      const { data: currentQuote } = await ctx.supabase
        .from('quote_history')
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
        .from('quote_history')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single()

      checkSupabaseError(error, 'Quote')

      // Record status history
      if (currentQuote?.status !== 'sent') {
        await ctx.supabase.from('quote_status_history').insert({
          quote_id: input.id,
          quote_type: 'dismantle',
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
        .from('quote_history')
        .select('status')
        .eq('id', input.id)
        .single()

      // Only update if not already viewed or in a later state
      if (currentQuote?.status === 'sent') {
        const { data, error } = await ctx.supabase
          .from('quote_history')
          .update({
            status: 'viewed',
            viewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.id)
          .select()
          .single()

        checkSupabaseError(error, 'Quote')

        // Record status history
        await ctx.supabase.from('quote_status_history').insert({
          quote_id: input.id,
          quote_type: 'dismantle',
          previous_status: 'sent',
          new_status: 'viewed',
          changed_by: ctx.user.id,
        })

        return data
      }

      // Return current quote if already in a later state
      const { data } = await ctx.supabase
        .from('quote_history')
        .select('*')
        .eq('id', input.id)
        .single()

      return data
    }),

  // Mark as accepted
  markAsAccepted: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get current quote for history and notification
      const { data: currentQuote } = await ctx.supabase
        .from('quote_history')
        .select('status, quote_number, customer_name')
        .eq('id', input.id)
        .single()

      const { data, error } = await ctx.supabase
        .from('quote_history')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single()

      checkSupabaseError(error, 'Quote')

      // Record status history
      if (currentQuote?.status !== 'accepted') {
        await ctx.supabase.from('quote_status_history').insert({
          quote_id: input.id,
          quote_type: 'dismantle',
          previous_status: currentQuote?.status || null,
          new_status: 'accepted',
          changed_by: ctx.user.id,
        })

        // Send notification email
        try {
          await getResend().emails.send({
            from: 'Dismantle Pro <noreply@dismantlepro.com>',
            to: process.env.ADMIN_EMAIL || 'admin@example.com',
            subject: `Quote ${currentQuote?.quote_number} Accepted`,
            html: `
              <h2>Quote Accepted</h2>
              <p><strong>Quote:</strong> ${currentQuote?.quote_number}</p>
              <p><strong>Customer:</strong> ${currentQuote?.customer_name}</p>
              <p>The quote has been marked as accepted.</p>
            `,
          })
        } catch (emailError) {
          console.error('Failed to send acceptance notification:', emailError)
        }
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
        .from('quote_history')
        .select('status, quote_number, customer_name')
        .eq('id', input.id)
        .single()

      const { data, error } = await ctx.supabase
        .from('quote_history')
        .update({
          status: 'rejected',
          rejection_reason: input.rejection_reason,
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single()

      checkSupabaseError(error, 'Quote')

      // Record status history
      if (currentQuote?.status !== 'rejected') {
        await ctx.supabase.from('quote_status_history').insert({
          quote_id: input.id,
          quote_type: 'dismantle',
          previous_status: currentQuote?.status || null,
          new_status: 'rejected',
          changed_by: ctx.user.id,
          notes: input.rejection_reason,
        })

        // Send notification email
        try {
          await getResend().emails.send({
            from: 'Dismantle Pro <noreply@dismantlepro.com>',
            to: process.env.ADMIN_EMAIL || 'admin@example.com',
            subject: `Quote ${currentQuote?.quote_number} Rejected`,
            html: `
              <h2>Quote Rejected</h2>
              <p><strong>Quote:</strong> ${currentQuote?.quote_number}</p>
              <p><strong>Customer:</strong> ${currentQuote?.customer_name}</p>
              ${input.rejection_reason ? `<p><strong>Reason:</strong> ${input.rejection_reason}</p>` : ''}
            `,
          })
        } catch (emailError) {
          console.error('Failed to send rejection notification:', emailError)
        }
      }

      return data
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

        checkSupabaseError(error, 'Quote')
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

        checkSupabaseError(error, 'Quote')
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

    checkSupabaseError(error, 'Quote', true)
    return data
  }),

  // Delete user's draft
  deleteDraft: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from('quote_drafts')
      .delete()
      .eq('user_id', ctx.user.id)

    checkSupabaseError(error, 'Quote')
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
        .from('quote_history')
        .select('*')
        .eq('id', input.sourceQuoteId)
        .single()

      checkSupabaseError(fetchError, 'Quote')
      assertDataExists(sourceQuote, 'Source quote')

      // Determine the parent quote ID (original in the chain)
      const parentQuoteId = sourceQuote.parent_quote_id || sourceQuote.id

      // Get the current max version for this quote chain
      const { data: versions } = await ctx.supabase
        .from('quote_history')
        .select('version')
        .or(`id.eq.${parentQuoteId},parent_quote_id.eq.${parentQuoteId}`)
        .order('version', { ascending: false })
        .limit(1)

      const newVersion = (versions?.[0]?.version || 1) + 1

      // Mark all previous versions as not latest
      await ctx.supabase
        .from('quote_history')
        .update({ is_latest_version: false })
        .or(`id.eq.${parentQuoteId},parent_quote_id.eq.${parentQuoteId}`)

      // Generate new quote number with version suffix
      const baseQuoteNumber = sourceQuote.quote_number.replace(/-v\d+$/, '')
      const newQuoteNumber = `${baseQuoteNumber}-v${newVersion}`

      // Create the new revision
      const { data: newQuote, error: createError } = await ctx.supabase
        .from('quote_history')
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

      checkSupabaseError(createError, 'Quote')

      // Record in status history
      await ctx.supabase.from('quote_status_history').insert({
        quote_id: newQuote.id,
        quote_type: 'dismantle',
        previous_status: null,
        new_status: 'draft',
        changed_by: ctx.user.id,
        notes: `Revision ${newVersion} created from ${sourceQuote.quote_number}`,
      })

      return newQuote
    }),

  // Get all versions of a quote (optimized: single query with eager loading)
  getVersions: protectedProcedure
    .input(z.object({ quoteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // First get the quote to find parent
      const { data: quote } = await ctx.supabase
        .from('quote_history')
        .select('id, parent_quote_id')
        .eq('id', input.quoteId)
        .single()

      if (!quote) return []

      const parentId = quote.parent_quote_id || quote.id

      // Get all versions with creator info in a single query using eager loading
      const { data: versions, error } = await ctx.supabase
        .from('quote_history')
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

      checkSupabaseError(error, 'Quote')

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
        .from('quote_history')
        .select('*')
        .in('id', [input.quoteId1, input.quoteId2])

      checkSupabaseError(error, 'Quote')
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
        { key: 'make_name', label: 'Make' },
        { key: 'model_name', label: 'Model' },
        { key: 'location', label: 'Location' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'margin_percentage', label: 'Margin %' },
        { key: 'total', label: 'Total' },
        { key: 'internal_notes', label: 'Internal Notes' },
        { key: 'quote_notes', label: 'Quote Notes' },
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
