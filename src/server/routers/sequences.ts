import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError, assertDataExists } from '@/lib/errors'

const triggerEvents = ['quote_sent', 'quote_viewed', 'quote_accepted', 'quote_rejected'] as const

export const sequencesRouter = router({
  // Get all sequences for current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('email_sequences')
      .select(`
        *,
        steps:email_sequence_steps(*)
      `)
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })

    checkSupabaseError(error, 'Sequence')
    return data || []
  }),

  // Get a single sequence with steps
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('email_sequences')
        .select(`
          *,
          steps:email_sequence_steps(*)
        `)
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      checkSupabaseError(error, 'Sequence')
      assertDataExists(data, 'Sequence')
      return data
    }),

  // Create a new sequence
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        trigger_event: z.enum(triggerEvents),
        is_active: z.boolean().default(true),
        steps: z.array(
          z.object({
            step_order: z.number().min(1),
            delay_days: z.number().min(0).max(365),
            delay_hours: z.number().min(0).max(23).default(0),
            email_subject: z.string().min(1),
            email_body: z.string().min(1),
            stop_if_status: z.array(z.string()).default(['accepted', 'rejected']),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { steps, ...sequenceData } = input

      // Create the sequence
      const { data: sequence, error: sequenceError } = await ctx.supabase
        .from('email_sequences')
        .insert({
          ...sequenceData,
          user_id: ctx.user.id,
        })
        .select()
        .single()

      checkSupabaseError(sequenceError, 'Sequence')

      // Create steps if provided
      if (steps && steps.length > 0) {
        const stepsWithSequenceId = steps.map((step) => ({
          ...step,
          sequence_id: sequence.id,
        }))

        const { error: stepsError } = await ctx.supabase
          .from('email_sequence_steps')
          .insert(stepsWithSequenceId)

        if (stepsError) {
          // Rollback - delete the sequence if steps fail
          await ctx.supabase.from('email_sequences').delete().eq('id', sequence.id)
          throw new Error(`Failed to create sequence steps: ${stepsError.message}`)
        }
      }

      return sequence
    }),

  // Update a sequence
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        trigger_event: z.enum(triggerEvents).optional(),
        is_active: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const { data, error } = await ctx.supabase
        .from('email_sequences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      checkSupabaseError(error, 'Sequence')
      return data
    }),

  // Toggle sequence active status
  toggleActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get current state
      const { data: current, error: fetchError } = await ctx.supabase
        .from('email_sequences')
        .select('is_active')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      checkSupabaseError(fetchError, 'Sequence')
      assertDataExists(current, 'Sequence')

      const { data, error } = await ctx.supabase
        .from('email_sequences')
        .update({
          is_active: !current.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      checkSupabaseError(error, 'Sequence')
      return data
    }),

  // Delete a sequence
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('email_sequences')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      checkSupabaseError(error, 'Sequence')
      return { success: true }
    }),

  // === Sequence Steps ===

  // Add a step to a sequence
  addStep: protectedProcedure
    .input(
      z.object({
        sequence_id: z.string().uuid(),
        step_order: z.number().min(1),
        delay_days: z.number().min(0).max(365),
        delay_hours: z.number().min(0).max(23).default(0),
        email_subject: z.string().min(1),
        email_body: z.string().min(1),
        stop_if_status: z.array(z.string()).default(['accepted', 'rejected']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const { data: sequence, error: verifyError } = await ctx.supabase
        .from('email_sequences')
        .select('id')
        .eq('id', input.sequence_id)
        .eq('user_id', ctx.user.id)
        .single()

      if (verifyError || !sequence) {
        throw new Error('Sequence not found')
      }

      const { data, error } = await ctx.supabase
        .from('email_sequence_steps')
        .insert(input)
        .select()
        .single()

      checkSupabaseError(error, 'Step')
      return data
    }),

  // Update a step
  updateStep: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        step_order: z.number().min(1).optional(),
        delay_days: z.number().min(0).max(365).optional(),
        delay_hours: z.number().min(0).max(23).optional(),
        email_subject: z.string().min(1).optional(),
        email_body: z.string().min(1).optional(),
        stop_if_status: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      // Verify ownership through parent sequence
      const { data: step, error: fetchError } = await ctx.supabase
        .from('email_sequence_steps')
        .select('sequence_id')
        .eq('id', id)
        .single()

      if (fetchError || !step) {
        throw new Error('Step not found')
      }

      const { data: sequence, error: verifyError } = await ctx.supabase
        .from('email_sequences')
        .select('id')
        .eq('id', step.sequence_id)
        .eq('user_id', ctx.user.id)
        .single()

      if (verifyError || !sequence) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await ctx.supabase
        .from('email_sequence_steps')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      checkSupabaseError(error, 'Step')
      return data
    }),

  // Delete a step
  deleteStep: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through parent sequence
      const { data: step, error: fetchError } = await ctx.supabase
        .from('email_sequence_steps')
        .select('sequence_id')
        .eq('id', input.id)
        .single()

      if (fetchError || !step) {
        throw new Error('Step not found')
      }

      const { data: sequence, error: verifyError } = await ctx.supabase
        .from('email_sequences')
        .select('id')
        .eq('id', step.sequence_id)
        .eq('user_id', ctx.user.id)
        .single()

      if (verifyError || !sequence) {
        throw new Error('Unauthorized')
      }

      const { error } = await ctx.supabase
        .from('email_sequence_steps')
        .delete()
        .eq('id', input.id)

      checkSupabaseError(error, 'Step')
      return { success: true }
    }),

  // === Enrollments ===

  // Get enrollments for a sequence
  getEnrollments: protectedProcedure
    .input(
      z.object({
        sequence_id: z.string().uuid().optional(),
        status: z.enum(['active', 'completed', 'stopped', 'error']).optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('sequence_enrollments')
        .select(`
          *,
          sequence:email_sequences(id, name, trigger_event),
          quote:quote_history(id, quote_number, customer_name, status),
          inland_quote:inland_quotes(id, quote_number, customer_name, status)
        `)
        .order('enrolled_at', { ascending: false })
        .limit(input.limit)

      if (input.sequence_id) {
        query = query.eq('sequence_id', input.sequence_id)
      }

      if (input.status) {
        query = query.eq('status', input.status)
      }

      // Filter to only user's sequences
      const { data: userSequences } = await ctx.supabase
        .from('email_sequences')
        .select('id')
        .eq('user_id', ctx.user.id)

      const sequenceIds = userSequences?.map((s) => s.id) || []
      if (sequenceIds.length > 0) {
        query = query.in('sequence_id', sequenceIds)
      }

      const { data, error } = await query

      checkSupabaseError(error, 'Enrollment')
      return data || []
    }),

  // Manually enroll a quote in a sequence
  enrollQuote: protectedProcedure
    .input(
      z.object({
        sequence_id: z.string().uuid(),
        quote_id: z.string().uuid().optional(),
        inland_quote_id: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.quote_id && !input.inland_quote_id) {
        throw new Error('Either quote_id or inland_quote_id is required')
      }

      // Verify sequence ownership
      const { data: sequence, error: verifyError } = await ctx.supabase
        .from('email_sequences')
        .select('id')
        .eq('id', input.sequence_id)
        .eq('user_id', ctx.user.id)
        .single()

      if (verifyError || !sequence) {
        throw new Error('Sequence not found')
      }

      // Get the first step to calculate next_step_at
      const { data: firstStep } = await ctx.supabase
        .from('email_sequence_steps')
        .select('delay_days, delay_hours')
        .eq('sequence_id', input.sequence_id)
        .order('step_order', { ascending: true })
        .limit(1)
        .single()

      const now = new Date()
      let nextStepAt = now

      if (firstStep) {
        nextStepAt = new Date(
          now.getTime() +
            firstStep.delay_days * 24 * 60 * 60 * 1000 +
            firstStep.delay_hours * 60 * 60 * 1000
        )
      }

      const { data, error } = await ctx.supabase
        .from('sequence_enrollments')
        .insert({
          sequence_id: input.sequence_id,
          quote_id: input.quote_id,
          inland_quote_id: input.inland_quote_id,
          current_step: 0,
          status: 'active',
          next_step_at: nextStepAt.toISOString(),
        })
        .select()
        .single()

      checkSupabaseError(error, 'Enrollment')
      return data
    }),

  // Stop an enrollment
  stopEnrollment: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('sequence_enrollments')
        .update({
          status: 'stopped',
          completed_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single()

      checkSupabaseError(error, 'Enrollment')
      return data
    }),

  // Get stats for sequences
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Get user's sequences
    const { data: sequences } = await ctx.supabase
      .from('email_sequences')
      .select('id')
      .eq('user_id', ctx.user.id)

    const sequenceIds = sequences?.map((s) => s.id) || []

    if (sequenceIds.length === 0) {
      return {
        total_sequences: 0,
        active_sequences: 0,
        total_enrollments: 0,
        active_enrollments: 0,
        completed_enrollments: 0,
      }
    }

    // Get sequence counts
    const { count: totalSequences } = await ctx.supabase
      .from('email_sequences')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ctx.user.id)

    const { count: activeSequences } = await ctx.supabase
      .from('email_sequences')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ctx.user.id)
      .eq('is_active', true)

    // Get enrollment counts
    const { count: totalEnrollments } = await ctx.supabase
      .from('sequence_enrollments')
      .select('*', { count: 'exact', head: true })
      .in('sequence_id', sequenceIds)

    const { count: activeEnrollments } = await ctx.supabase
      .from('sequence_enrollments')
      .select('*', { count: 'exact', head: true })
      .in('sequence_id', sequenceIds)
      .eq('status', 'active')

    const { count: completedEnrollments } = await ctx.supabase
      .from('sequence_enrollments')
      .select('*', { count: 'exact', head: true })
      .in('sequence_id', sequenceIds)
      .eq('status', 'completed')

    return {
      total_sequences: totalSequences || 0,
      active_sequences: activeSequences || 0,
      total_enrollments: totalEnrollments || 0,
      active_enrollments: activeEnrollments || 0,
      completed_enrollments: completedEnrollments || 0,
    }
  }),
})
