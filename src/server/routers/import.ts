import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'

export const importRouter = router({
  // Import equipment makes
  importMakes: protectedProcedure
    .input(
      z.object({
        data: z.array(
          z.object({
            name: z.string(),
            popularity_rank: z.number().optional(),
          })
        ),
        skipDuplicates: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let imported = 0
      let skipped = 0
      const errors: string[] = []

      for (const item of input.data) {
        try {
          if (input.skipDuplicates) {
            const { data: existing } = await ctx.supabase
              .from('equipment_makes')
              .select('id')
              .eq('name', item.name)
              .maybeSingle()

            if (existing) {
              skipped++
              continue
            }
          }

          const { error } = await ctx.supabase
            .from('equipment_makes')
            .insert(item)

          checkSupabaseError(error, 'Import')
          imported++
        } catch (error) {
          errors.push(`Failed to import "${item.name}": ${(error as Error).message}`)
        }
      }

      return { imported, skipped, errors }
    }),

  // Import equipment models
  importModels: protectedProcedure
    .input(
      z.object({
        data: z.array(
          z.object({
            make_name: z.string(),
            name: z.string(),
          })
        ),
        skipDuplicates: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let imported = 0
      let skipped = 0
      const errors: string[] = []

      for (const item of input.data) {
        try {
          // Find make by name
          const { data: make } = await ctx.supabase
            .from('equipment_makes')
            .select('id')
            .eq('name', item.make_name)
            .maybeSingle()

          if (!make) {
            errors.push(`Make not found: "${item.make_name}"`)
            continue
          }

          if (input.skipDuplicates) {
            const { data: existing } = await ctx.supabase
              .from('equipment_models')
              .select('id')
              .eq('make_id', make.id)
              .eq('name', item.name)
              .maybeSingle()

            if (existing) {
              skipped++
              continue
            }
          }

          const { error } = await ctx.supabase
            .from('equipment_models')
            .insert({ make_id: make.id, name: item.name })

          checkSupabaseError(error, 'Import')
          imported++
        } catch (error) {
          errors.push(`Failed to import "${item.name}": ${(error as Error).message}`)
        }
      }

      return { imported, skipped, errors }
    }),

  // Import companies
  importCompanies: protectedProcedure
    .input(
      z.object({
        data: z.array(
          z.object({
            name: z.string(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zip: z.string().optional(),
            status: z.enum(['active', 'inactive', 'prospect', 'vip']).optional(),
          })
        ),
        skipDuplicates: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let imported = 0
      let skipped = 0
      const errors: string[] = []

      for (const item of input.data) {
        try {
          if (input.skipDuplicates) {
            const { data: existing } = await ctx.supabase
              .from('companies')
              .select('id')
              .eq('name', item.name)
              .maybeSingle()

            if (existing) {
              skipped++
              continue
            }
          }

          const { error } = await ctx.supabase.from('companies').insert({
            ...item,
            status: item.status || 'active',
          })

          checkSupabaseError(error, 'Import')
          imported++
        } catch (error) {
          errors.push(`Failed to import "${item.name}": ${(error as Error).message}`)
        }
      }

      return { imported, skipped, errors }
    }),

  // Import contacts
  importContacts: protectedProcedure
    .input(
      z.object({
        data: z.array(
          z.object({
            company_name: z.string(),
            first_name: z.string(),
            last_name: z.string(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            role: z.string().optional(),
            is_primary: z.boolean().optional(),
          })
        ),
        skipDuplicates: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let imported = 0
      let skipped = 0
      const errors: string[] = []

      for (const item of input.data) {
        try {
          // Find company by name
          const { data: company } = await ctx.supabase
            .from('companies')
            .select('id')
            .eq('name', item.company_name)
            .maybeSingle()

          if (!company) {
            errors.push(`Company not found: "${item.company_name}"`)
            continue
          }

          if (input.skipDuplicates && item.email) {
            const { data: existing } = await ctx.supabase
              .from('contacts')
              .select('id')
              .eq('email', item.email)
              .maybeSingle()

            if (existing) {
              skipped++
              continue
            }
          }

          const { company_name, ...contactData } = item
          const { error } = await ctx.supabase.from('contacts').insert({
            ...contactData,
            company_id: company.id,
          })

          checkSupabaseError(error, 'Import')
          imported++
        } catch (error) {
          errors.push(
            `Failed to import "${item.first_name} ${item.last_name}": ${(error as Error).message}`
          )
        }
      }

      return { imported, skipped, errors }
    }),

  // Import rates
  importRates: protectedProcedure
    .input(
      z.object({
        data: z.array(
          z.object({
            make_name: z.string(),
            model_name: z.string(),
            location: z.string(),
            dismantling_loading_cost: z.number().optional(),
            loading_cost: z.number().optional(),
            blocking_bracing_cost: z.number().optional(),
            rigging_cost: z.number().optional(),
            storage_cost: z.number().optional(),
            transport_cost: z.number().optional(),
            equipment_cost: z.number().optional(),
            labor_cost: z.number().optional(),
            permit_cost: z.number().optional(),
            escort_cost: z.number().optional(),
            miscellaneous_cost: z.number().optional(),
          })
        ),
        skipDuplicates: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let imported = 0
      let skipped = 0
      let updated = 0
      const errors: string[] = []

      for (const item of input.data) {
        try {
          // Find make
          const { data: make } = await ctx.supabase
            .from('equipment_makes')
            .select('id')
            .eq('name', item.make_name)
            .maybeSingle()

          if (!make) {
            errors.push(`Make not found: "${item.make_name}"`)
            continue
          }

          // Find model
          const { data: model } = await ctx.supabase
            .from('equipment_models')
            .select('id')
            .eq('make_id', make.id)
            .eq('name', item.model_name)
            .maybeSingle()

          if (!model) {
            errors.push(`Model not found: "${item.model_name}" for make "${item.make_name}"`)
            continue
          }

          const { make_name, model_name, ...rateData } = item

          // Check if rate exists
          const { data: existing } = await ctx.supabase
            .from('equipment_rates')
            .select('id')
            .eq('make_id', make.id)
            .eq('model_id', model.id)
            .eq('location', item.location)
            .maybeSingle()

          if (existing) {
            if (input.skipDuplicates) {
              skipped++
              continue
            }
            // Update existing
            const { error } = await ctx.supabase
              .from('equipment_rates')
              .update(rateData)
              .eq('id', existing.id)

            checkSupabaseError(error, 'Import')
            updated++
          } else {
            // Insert new
            const { error } = await ctx.supabase.from('equipment_rates').insert({
              ...rateData,
              make_id: make.id,
              model_id: model.id,
            })

            checkSupabaseError(error, 'Import')
            imported++
          }
        } catch (error) {
          errors.push(
            `Failed to import rate for "${item.make_name} ${item.model_name}": ${(error as Error).message}`
          )
        }
      }

      return { imported, skipped, updated, errors }
    }),
})
