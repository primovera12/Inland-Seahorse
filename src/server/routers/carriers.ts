/**
 * Carriers Router
 *
 * tRPC router for managing carriers (trucking companies and owner-operators),
 * their drivers, and trucks.
 */

import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'
import { TRPCError } from '@trpc/server'
import type {
  CarrierType,
  CarrierStatus,
  DriverStatus,
  TruckStatus,
  PaymentMethod,
  CDLClass,
  Carrier,
  CarrierRow,
  CarrierDriver,
  CarrierDriverRow,
  CarrierTruck,
  CarrierTruckRow,
  CarrierListItem,
  CarrierDetail,
  CarrierSearchResult,
} from '@/types/carriers'
import {
  carrierRowToCarrier,
  driverRowToDriver,
  truckRowToTruck,
} from '@/types/carriers'

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const carrierTypeSchema = z.enum(['company', 'owner_operator'])
const carrierStatusSchema = z.enum(['active', 'inactive', 'preferred', 'on_hold', 'blacklisted'])
const driverStatusSchema = z.enum(['active', 'inactive', 'on_leave'])
const truckStatusSchema = z.enum(['active', 'inactive', 'out_of_service', 'sold'])
const paymentMethodSchema = z.enum(['check', 'ach', 'quick_pay', 'factoring'])
const cdlClassSchema = z.enum(['A', 'B', 'C'])

// Carrier input schema
const createCarrierInputSchema = z.object({
  carrierType: carrierTypeSchema,
  companyName: z.string().optional(),
  mcNumber: z.string().optional(),
  dotNumber: z.string().optional(),
  einTaxId: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactPhone: z.string().optional(),
  primaryContactEmail: z.string().email().optional().or(z.literal('')),
  billingEmail: z.string().email().optional().or(z.literal('')),
  paymentTermsDays: z.number().int().positive().default(30),
  preferredPaymentMethod: paymentMethodSchema.optional(),
  factoringCompanyName: z.string().optional(),
  factoringCompanyPhone: z.string().optional(),
  factoringCompanyEmail: z.string().email().optional().or(z.literal('')),
  insuranceCompany: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  cargoInsuranceLimitCents: z.number().int().min(0).optional(),
  status: carrierStatusSchema.default('active'),
  notes: z.string().optional(),
})

// Driver input schema
const createDriverInputSchema = z.object({
  carrierId: z.string().uuid(),
  isOwner: z.boolean().default(false),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nickname: z.string().optional(),
  phone: z.string().optional(),
  phoneSecondary: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  cdlNumber: z.string().optional(),
  cdlState: z.string().optional(),
  cdlClass: cdlClassSchema.optional(),
  cdlExpiry: z.string().optional(),
  cdlEndorsements: z.string().optional(),
  medicalCardExpiry: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  status: driverStatusSchema.default('active'),
  notes: z.string().optional(),
})

// Truck input schema
const createTruckInputSchema = z.object({
  carrierId: z.string().uuid(),
  assignedDriverId: z.string().uuid().optional(),
  unitNumber: z.string().optional(),
  vin: z.string().optional(),
  licensePlate: z.string().optional(),
  licensePlateState: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  truckTypeId: z.string().optional(),
  category: z.string().optional(),
  customTypeDescription: z.string().optional(),
  deckLengthFt: z.number().positive().optional(),
  deckWidthFt: z.number().positive().optional(),
  deckHeightFt: z.number().positive().optional(),
  wellLengthFt: z.number().positive().optional(),
  maxCargoWeightLbs: z.number().int().positive().optional(),
  tareWeightLbs: z.number().int().positive().optional(),
  axleCount: z.number().int().positive().optional(),
  hasTarps: z.boolean().default(false),
  tarpType: z.string().optional(),
  hasChains: z.boolean().default(false),
  chainCount: z.number().int().positive().optional(),
  hasStraps: z.boolean().default(false),
  strapCount: z.number().int().positive().optional(),
  hasCoilRacks: z.boolean().default(false),
  hasLoadBars: z.boolean().default(false),
  hasRamps: z.boolean().default(false),
  otherEquipment: z.string().optional(),
  registrationState: z.string().optional(),
  registrationExpiry: z.string().optional(),
  annualInspectionDate: z.string().optional(),
  annualInspectionExpiry: z.string().optional(),
  status: truckStatusSchema.default('active'),
  notes: z.string().optional(),
  imageUrl: z.string().url().optional(),
})

// Filter schemas
const carrierFilterSchema = z.object({
  search: z.string().optional(),
  carrierType: z.union([carrierTypeSchema, z.array(carrierTypeSchema)]).optional(),
  status: z.union([carrierStatusSchema, z.array(carrierStatusSchema)]).optional(),
  state: z.string().optional(),
  hasInsurance: z.boolean().optional(),
  insuranceExpiringWithin: z.number().int().positive().optional(),
})

const driverFilterSchema = z.object({
  carrierId: z.string().uuid().optional(),
  search: z.string().optional(),
  status: z.union([driverStatusSchema, z.array(driverStatusSchema)]).optional(),
  cdlExpiringWithin: z.number().int().positive().optional(),
  medicalExpiringWithin: z.number().int().positive().optional(),
})

const truckFilterSchema = z.object({
  carrierId: z.string().uuid().optional(),
  search: z.string().optional(),
  status: z.union([truckStatusSchema, z.array(truckStatusSchema)]).optional(),
  category: z.string().optional(),
  hasDriver: z.boolean().optional(),
  registrationExpiringWithin: z.number().int().positive().optional(),
  inspectionExpiringWithin: z.number().int().positive().optional(),
})

// Pagination schema
const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// =============================================================================
// ROUTER
// =============================================================================

export const carriersRouter = router({
  // ===========================================================================
  // CARRIERS CRUD
  // ===========================================================================

  /**
   * Get all carriers with filters and pagination
   */
  getAll: protectedProcedure
    .input(
      z.object({
        filters: carrierFilterSchema.optional(),
        pagination: paginationSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { filters, pagination } = input
      const page = pagination?.page ?? 1
      const pageSize = pagination?.pageSize ?? 25
      const sortBy = pagination?.sortBy ?? 'created_at'
      const sortOrder = pagination?.sortOrder ?? 'desc'

      // Build query
      let query = ctx.supabase
        .from('carriers')
        .select(
          `
          id,
          carrier_type,
          company_name,
          mc_number,
          dot_number,
          city,
          state,
          primary_contact_name,
          primary_contact_phone,
          status,
          insurance_expiry,
          created_at,
          carrier_drivers(count),
          carrier_trucks(count)
        `,
          { count: 'exact' }
        )
        .eq('is_active', true)

      // Apply filters
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`
        query = query.or(
          `company_name.ilike.${searchTerm},mc_number.ilike.${searchTerm},dot_number.ilike.${searchTerm},primary_contact_name.ilike.${searchTerm}`
        )
      }

      if (filters?.carrierType) {
        if (Array.isArray(filters.carrierType)) {
          query = query.in('carrier_type', filters.carrierType)
        } else {
          query = query.eq('carrier_type', filters.carrierType)
        }
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters?.state) {
        query = query.eq('state', filters.state)
      }

      if (filters?.hasInsurance !== undefined) {
        if (filters.hasInsurance) {
          query = query.not('insurance_expiry', 'is', null)
        } else {
          query = query.is('insurance_expiry', null)
        }
      }

      if (filters?.insuranceExpiringWithin) {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + filters.insuranceExpiringWithin)
        query = query
          .gte('insurance_expiry', new Date().toISOString().split('T')[0])
          .lte('insurance_expiry', futureDate.toISOString().split('T')[0])
      }

      // Apply sorting
      const sortColumn =
        sortBy === 'companyName' ? 'company_name' :
        sortBy === 'createdAt' ? 'created_at' :
        sortBy === 'mcNumber' ? 'mc_number' :
        sortBy === 'insuranceExpiry' ? 'insurance_expiry' :
        sortBy
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

      // Apply pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      checkSupabaseError(error, 'Carriers')

      // Transform data
      const carriers: CarrierListItem[] = (data || []).map((row: any) => ({
        id: row.id,
        carrierType: row.carrier_type as CarrierType,
        companyName: row.company_name,
        mcNumber: row.mc_number,
        dotNumber: row.dot_number,
        city: row.city,
        state: row.state,
        primaryContactName: row.primary_contact_name,
        primaryContactPhone: row.primary_contact_phone,
        status: row.status as CarrierStatus,
        driversCount: row.carrier_drivers?.[0]?.count ?? 0,
        trucksCount: row.carrier_trucks?.[0]?.count ?? 0,
        insuranceExpiry: row.insurance_expiry ? new Date(row.insurance_expiry) : null,
        createdAt: new Date(row.created_at),
      }))

      return {
        data: carriers,
        total: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      }
    }),

  /**
   * Get a single carrier by ID with all related data
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Fetch carrier
      const { data: carrierData, error: carrierError } = await ctx.supabase
        .from('carriers')
        .select('*')
        .eq('id', input.id)
        .eq('is_active', true)
        .single()

      checkSupabaseError(carrierError, 'Carrier')

      if (!carrierData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Carrier not found',
        })
      }

      // Fetch related data in parallel
      const [driversResult, trucksResult] = await Promise.all([
        ctx.supabase
          .from('carrier_drivers')
          .select('*')
          .eq('carrier_id', input.id)
          .eq('is_active', true)
          .order('last_name'),
        ctx.supabase
          .from('carrier_trucks')
          .select('*')
          .eq('carrier_id', input.id)
          .eq('is_active', true)
          .order('unit_number'),
      ])

      // Transform and return
      const carrier = carrierRowToCarrier(carrierData as CarrierRow)
      const drivers = (driversResult.data || []).map((row: CarrierDriverRow) =>
        driverRowToDriver(row)
      )
      const trucks = (trucksResult.data || []).map((row: CarrierTruckRow) =>
        truckRowToTruck(row)
      )

      // Link drivers to trucks
      for (const truck of trucks) {
        if (truck.assignedDriverId) {
          truck.assignedDriver = drivers.find((d) => d.id === truck.assignedDriverId) || null
        }
      }

      const result: CarrierDetail = {
        ...carrier,
        drivers,
        trucks,
        driversCount: drivers.length,
        trucksCount: trucks.length,
      }

      return result
    }),

  /**
   * Create a new carrier
   */
  create: protectedProcedure
    .input(createCarrierInputSchema)
    .mutation(async ({ ctx, input }) => {
      const carrierInsert = {
        carrier_type: input.carrierType,
        company_name: input.companyName || null,
        mc_number: input.mcNumber || null,
        dot_number: input.dotNumber || null,
        ein_tax_id: input.einTaxId || null,
        address_line1: input.addressLine1 || null,
        address_line2: input.addressLine2 || null,
        city: input.city || null,
        state: input.state || null,
        zip: input.zip || null,
        primary_contact_name: input.primaryContactName || null,
        primary_contact_phone: input.primaryContactPhone || null,
        primary_contact_email: input.primaryContactEmail || null,
        billing_email: input.billingEmail || null,
        payment_terms_days: input.paymentTermsDays ?? 30,
        preferred_payment_method: input.preferredPaymentMethod || null,
        factoring_company_name: input.factoringCompanyName || null,
        factoring_company_phone: input.factoringCompanyPhone || null,
        factoring_company_email: input.factoringCompanyEmail || null,
        insurance_company: input.insuranceCompany || null,
        insurance_policy_number: input.insurancePolicyNumber || null,
        insurance_expiry: input.insuranceExpiry || null,
        cargo_insurance_limit_cents: input.cargoInsuranceLimitCents || null,
        status: input.status ?? 'active',
        notes: input.notes || null,
      }

      const { data: newCarrier, error } = await ctx.supabase
        .from('carriers')
        .insert(carrierInsert)
        .select()
        .single()

      checkSupabaseError(error, 'Carrier')

      // Log activity
      await ctx.adminSupabase.from('activity_logs').insert({
        user_id: ctx.user.id,
        activity_type: 'carrier_created',
        subject: `Carrier ${input.companyName || 'New Carrier'} created`,
        description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} created carrier ${input.companyName || 'New Carrier'}`.trim(),
        metadata: {
          carrier_id: newCarrier.id,
          carrier_type: input.carrierType,
        },
      })

      return { id: newCarrier.id }
    }),

  /**
   * Update an existing carrier
   */
  update: protectedProcedure
    .input(
      createCarrierInputSchema.partial().extend({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input

      // Verify carrier exists
      const { data: existing, error: existingError } = await ctx.supabase
        .from('carriers')
        .select('id, company_name')
        .eq('id', id)
        .eq('is_active', true)
        .single()

      checkSupabaseError(existingError, 'Carrier')

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Carrier not found',
        })
      }

      const carrierUpdate: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }

      if (updateData.carrierType !== undefined) carrierUpdate.carrier_type = updateData.carrierType
      if (updateData.companyName !== undefined) carrierUpdate.company_name = updateData.companyName
      if (updateData.mcNumber !== undefined) carrierUpdate.mc_number = updateData.mcNumber
      if (updateData.dotNumber !== undefined) carrierUpdate.dot_number = updateData.dotNumber
      if (updateData.einTaxId !== undefined) carrierUpdate.ein_tax_id = updateData.einTaxId
      if (updateData.addressLine1 !== undefined) carrierUpdate.address_line1 = updateData.addressLine1
      if (updateData.addressLine2 !== undefined) carrierUpdate.address_line2 = updateData.addressLine2
      if (updateData.city !== undefined) carrierUpdate.city = updateData.city
      if (updateData.state !== undefined) carrierUpdate.state = updateData.state
      if (updateData.zip !== undefined) carrierUpdate.zip = updateData.zip
      if (updateData.primaryContactName !== undefined) carrierUpdate.primary_contact_name = updateData.primaryContactName
      if (updateData.primaryContactPhone !== undefined) carrierUpdate.primary_contact_phone = updateData.primaryContactPhone
      if (updateData.primaryContactEmail !== undefined) carrierUpdate.primary_contact_email = updateData.primaryContactEmail
      if (updateData.billingEmail !== undefined) carrierUpdate.billing_email = updateData.billingEmail
      if (updateData.paymentTermsDays !== undefined) carrierUpdate.payment_terms_days = updateData.paymentTermsDays
      if (updateData.preferredPaymentMethod !== undefined) carrierUpdate.preferred_payment_method = updateData.preferredPaymentMethod
      if (updateData.factoringCompanyName !== undefined) carrierUpdate.factoring_company_name = updateData.factoringCompanyName
      if (updateData.factoringCompanyPhone !== undefined) carrierUpdate.factoring_company_phone = updateData.factoringCompanyPhone
      if (updateData.factoringCompanyEmail !== undefined) carrierUpdate.factoring_company_email = updateData.factoringCompanyEmail
      if (updateData.insuranceCompany !== undefined) carrierUpdate.insurance_company = updateData.insuranceCompany
      if (updateData.insurancePolicyNumber !== undefined) carrierUpdate.insurance_policy_number = updateData.insurancePolicyNumber
      if (updateData.insuranceExpiry !== undefined) carrierUpdate.insurance_expiry = updateData.insuranceExpiry
      if (updateData.cargoInsuranceLimitCents !== undefined) carrierUpdate.cargo_insurance_limit_cents = updateData.cargoInsuranceLimitCents
      if (updateData.status !== undefined) carrierUpdate.status = updateData.status
      if (updateData.notes !== undefined) carrierUpdate.notes = updateData.notes

      const { error: updateError } = await ctx.supabase
        .from('carriers')
        .update(carrierUpdate)
        .eq('id', id)

      checkSupabaseError(updateError, 'Carrier')

      // Log activity
      await ctx.adminSupabase.from('activity_logs').insert({
        user_id: ctx.user.id,
        activity_type: 'carrier_updated',
        subject: `Carrier ${existing.company_name || 'Unknown'} updated`,
        description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} updated carrier ${existing.company_name || 'Unknown'}`.trim(),
        metadata: {
          carrier_id: id,
        },
      })

      return { success: true }
    }),

  /**
   * Soft delete a carrier
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get carrier info for logging
      const { data: carrier, error: fetchError } = await ctx.supabase
        .from('carriers')
        .select('company_name')
        .eq('id', input.id)
        .single()

      checkSupabaseError(fetchError, 'Carrier')

      // Soft delete
      const { error } = await ctx.supabase
        .from('carriers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', input.id)

      checkSupabaseError(error, 'Carrier')

      // Log activity
      if (carrier) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'carrier_deleted',
          subject: `Carrier ${carrier.company_name || 'Unknown'} deleted`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} deleted carrier ${carrier.company_name || 'Unknown'}`.trim(),
          metadata: {
            carrier_id: input.id,
          },
        })
      }

      return { success: true }
    }),

  /**
   * Search carriers for autocomplete
   */
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1), limit: z.number().int().positive().default(10) }))
    .query(async ({ ctx, input }) => {
      const searchTerm = `%${input.query}%`

      const { data, error } = await ctx.supabase
        .from('carriers')
        .select('id, carrier_type, company_name, mc_number, city, state, status')
        .eq('is_active', true)
        .or(
          `company_name.ilike.${searchTerm},mc_number.ilike.${searchTerm},dot_number.ilike.${searchTerm}`
        )
        .limit(input.limit)

      checkSupabaseError(error, 'Carriers')

      const results: CarrierSearchResult[] = (data || []).map((row: any) => ({
        id: row.id,
        carrierType: row.carrier_type as CarrierType,
        companyName: row.company_name,
        mcNumber: row.mc_number,
        city: row.city,
        state: row.state,
        status: row.status as CarrierStatus,
      }))

      return results
    }),

  /**
   * Get carrier stats
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('carriers')
      .select('carrier_type, status')
      .eq('is_active', true)

    checkSupabaseError(error, 'Carriers')

    const stats = {
      total: 0,
      byType: { company: 0, owner_operator: 0 } as Record<CarrierType, number>,
      byStatus: {
        active: 0,
        inactive: 0,
        preferred: 0,
        on_hold: 0,
        blacklisted: 0,
      } as Record<CarrierStatus, number>,
    }

    for (const row of data || []) {
      stats.total++
      const type = row.carrier_type as CarrierType
      const status = row.status as CarrierStatus
      if (type in stats.byType) stats.byType[type]++
      if (status in stats.byStatus) stats.byStatus[status]++
    }

    return stats
  }),

  // ===========================================================================
  // DRIVERS CRUD
  // ===========================================================================

  /**
   * Get drivers for a carrier
   */
  getDrivers: protectedProcedure
    .input(
      z.object({
        carrierId: z.string().uuid(),
        filters: driverFilterSchema.optional(),
        pagination: paginationSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { carrierId, filters, pagination } = input
      const page = pagination?.page ?? 1
      const pageSize = pagination?.pageSize ?? 25
      const sortBy = pagination?.sortBy ?? 'last_name'
      const sortOrder = pagination?.sortOrder ?? 'asc'

      let query = ctx.supabase
        .from('carrier_drivers')
        .select('*', { count: 'exact' })
        .eq('carrier_id', carrierId)
        .eq('is_active', true)

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`
        query = query.or(
          `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`
        )
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters?.cdlExpiringWithin) {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + filters.cdlExpiringWithin)
        query = query
          .gte('cdl_expiry', new Date().toISOString().split('T')[0])
          .lte('cdl_expiry', futureDate.toISOString().split('T')[0])
      }

      if (filters?.medicalExpiringWithin) {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + filters.medicalExpiringWithin)
        query = query
          .gte('medical_card_expiry', new Date().toISOString().split('T')[0])
          .lte('medical_card_expiry', futureDate.toISOString().split('T')[0])
      }

      const sortColumn =
        sortBy === 'firstName' ? 'first_name' :
        sortBy === 'lastName' ? 'last_name' :
        sortBy === 'createdAt' ? 'created_at' :
        sortBy
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      checkSupabaseError(error, 'Carrier drivers')

      const drivers = (data || []).map((row: CarrierDriverRow) => driverRowToDriver(row))

      return {
        data: drivers,
        total: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      }
    }),

  /**
   * Get a single driver by ID
   */
  getDriverById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('carrier_drivers')
        .select('*')
        .eq('id', input.id)
        .eq('is_active', true)
        .single()

      checkSupabaseError(error, 'Carrier driver')

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Driver not found',
        })
      }

      return driverRowToDriver(data as CarrierDriverRow)
    }),

  /**
   * Create a new driver
   */
  createDriver: protectedProcedure
    .input(createDriverInputSchema)
    .mutation(async ({ ctx, input }) => {
      const driverInsert = {
        carrier_id: input.carrierId,
        is_owner: input.isOwner ?? false,
        first_name: input.firstName,
        last_name: input.lastName,
        nickname: input.nickname || null,
        phone: input.phone || null,
        phone_secondary: input.phoneSecondary || null,
        email: input.email || null,
        address_line1: input.addressLine1 || null,
        city: input.city || null,
        state: input.state || null,
        zip: input.zip || null,
        cdl_number: input.cdlNumber || null,
        cdl_state: input.cdlState || null,
        cdl_class: input.cdlClass || null,
        cdl_expiry: input.cdlExpiry || null,
        cdl_endorsements: input.cdlEndorsements || null,
        medical_card_expiry: input.medicalCardExpiry || null,
        emergency_contact_name: input.emergencyContactName || null,
        emergency_contact_phone: input.emergencyContactPhone || null,
        emergency_contact_relationship: input.emergencyContactRelationship || null,
        status: input.status ?? 'active',
        notes: input.notes || null,
      }

      const { data: newDriver, error } = await ctx.supabase
        .from('carrier_drivers')
        .insert(driverInsert)
        .select()
        .single()

      checkSupabaseError(error, 'Carrier driver')

      // Log activity
      await ctx.adminSupabase.from('activity_logs').insert({
        user_id: ctx.user.id,
        activity_type: 'driver_created',
        subject: `Driver ${input.firstName} ${input.lastName} added`,
        description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} added driver ${input.firstName} ${input.lastName}`.trim(),
        metadata: {
          driver_id: newDriver.id,
          carrier_id: input.carrierId,
        },
      })

      return { id: newDriver.id }
    }),

  /**
   * Update a driver
   */
  updateDriver: protectedProcedure
    .input(
      createDriverInputSchema.partial().omit({ carrierId: true }).extend({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input

      const driverUpdate: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }

      if (updateData.isOwner !== undefined) driverUpdate.is_owner = updateData.isOwner
      if (updateData.firstName !== undefined) driverUpdate.first_name = updateData.firstName
      if (updateData.lastName !== undefined) driverUpdate.last_name = updateData.lastName
      if (updateData.nickname !== undefined) driverUpdate.nickname = updateData.nickname
      if (updateData.phone !== undefined) driverUpdate.phone = updateData.phone
      if (updateData.phoneSecondary !== undefined) driverUpdate.phone_secondary = updateData.phoneSecondary
      if (updateData.email !== undefined) driverUpdate.email = updateData.email
      if (updateData.addressLine1 !== undefined) driverUpdate.address_line1 = updateData.addressLine1
      if (updateData.city !== undefined) driverUpdate.city = updateData.city
      if (updateData.state !== undefined) driverUpdate.state = updateData.state
      if (updateData.zip !== undefined) driverUpdate.zip = updateData.zip
      if (updateData.cdlNumber !== undefined) driverUpdate.cdl_number = updateData.cdlNumber
      if (updateData.cdlState !== undefined) driverUpdate.cdl_state = updateData.cdlState
      if (updateData.cdlClass !== undefined) driverUpdate.cdl_class = updateData.cdlClass
      if (updateData.cdlExpiry !== undefined) driverUpdate.cdl_expiry = updateData.cdlExpiry
      if (updateData.cdlEndorsements !== undefined) driverUpdate.cdl_endorsements = updateData.cdlEndorsements
      if (updateData.medicalCardExpiry !== undefined) driverUpdate.medical_card_expiry = updateData.medicalCardExpiry
      if (updateData.emergencyContactName !== undefined) driverUpdate.emergency_contact_name = updateData.emergencyContactName
      if (updateData.emergencyContactPhone !== undefined) driverUpdate.emergency_contact_phone = updateData.emergencyContactPhone
      if (updateData.emergencyContactRelationship !== undefined) driverUpdate.emergency_contact_relationship = updateData.emergencyContactRelationship
      if (updateData.status !== undefined) driverUpdate.status = updateData.status
      if (updateData.notes !== undefined) driverUpdate.notes = updateData.notes

      const { error } = await ctx.supabase
        .from('carrier_drivers')
        .update(driverUpdate)
        .eq('id', id)

      checkSupabaseError(error, 'Carrier driver')

      return { success: true }
    }),

  /**
   * Soft delete a driver
   */
  deleteDriver: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // First, unassign this driver from any trucks
      await ctx.supabase
        .from('carrier_trucks')
        .update({ assigned_driver_id: null })
        .eq('assigned_driver_id', input.id)

      // Soft delete
      const { error } = await ctx.supabase
        .from('carrier_drivers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', input.id)

      checkSupabaseError(error, 'Carrier driver')

      return { success: true }
    }),

  // ===========================================================================
  // TRUCKS CRUD
  // ===========================================================================

  /**
   * Get trucks for a carrier
   */
  getTrucks: protectedProcedure
    .input(
      z.object({
        carrierId: z.string().uuid(),
        filters: truckFilterSchema.optional(),
        pagination: paginationSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { carrierId, filters, pagination } = input
      const page = pagination?.page ?? 1
      const pageSize = pagination?.pageSize ?? 25
      const sortBy = pagination?.sortBy ?? 'unit_number'
      const sortOrder = pagination?.sortOrder ?? 'asc'

      let query = ctx.supabase
        .from('carrier_trucks')
        .select(
          `
          *,
          assigned_driver:carrier_drivers(id, first_name, last_name, phone)
        `,
          { count: 'exact' }
        )
        .eq('carrier_id', carrierId)
        .eq('is_active', true)

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`
        query = query.or(
          `unit_number.ilike.${searchTerm},vin.ilike.${searchTerm},license_plate.ilike.${searchTerm},make.ilike.${searchTerm},model.ilike.${searchTerm}`
        )
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      if (filters?.hasDriver !== undefined) {
        if (filters.hasDriver) {
          query = query.not('assigned_driver_id', 'is', null)
        } else {
          query = query.is('assigned_driver_id', null)
        }
      }

      if (filters?.registrationExpiringWithin) {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + filters.registrationExpiringWithin)
        query = query
          .gte('registration_expiry', new Date().toISOString().split('T')[0])
          .lte('registration_expiry', futureDate.toISOString().split('T')[0])
      }

      if (filters?.inspectionExpiringWithin) {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + filters.inspectionExpiringWithin)
        query = query
          .gte('annual_inspection_expiry', new Date().toISOString().split('T')[0])
          .lte('annual_inspection_expiry', futureDate.toISOString().split('T')[0])
      }

      const sortColumn =
        sortBy === 'unitNumber' ? 'unit_number' :
        sortBy === 'createdAt' ? 'created_at' :
        sortBy
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      checkSupabaseError(error, 'Carrier trucks')

      const trucks = (data || []).map((row: any) => {
        const truck = truckRowToTruck(row as CarrierTruckRow)
        if (row.assigned_driver) {
          truck.assignedDriver = {
            id: row.assigned_driver.id,
            carrierId: carrierId,
            isOwner: false,
            firstName: row.assigned_driver.first_name,
            lastName: row.assigned_driver.last_name,
            nickname: null,
            phone: row.assigned_driver.phone,
            phoneSecondary: null,
            email: null,
            addressLine1: null,
            city: null,
            state: null,
            zip: null,
            cdlNumber: null,
            cdlState: null,
            cdlClass: null,
            cdlExpiry: null,
            cdlEndorsements: null,
            medicalCardExpiry: null,
            emergencyContactName: null,
            emergencyContactPhone: null,
            emergencyContactRelationship: null,
            status: 'active' as DriverStatus,
            notes: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            fullName: `${row.assigned_driver.first_name} ${row.assigned_driver.last_name}`,
          }
        }
        return truck
      })

      return {
        data: trucks,
        total: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      }
    }),

  /**
   * Get a single truck by ID
   */
  getTruckById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('carrier_trucks')
        .select(
          `
          *,
          assigned_driver:carrier_drivers(*)
        `
        )
        .eq('id', input.id)
        .eq('is_active', true)
        .single()

      checkSupabaseError(error, 'Carrier truck')

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Truck not found',
        })
      }

      const truck = truckRowToTruck(data as CarrierTruckRow)
      if (data.assigned_driver) {
        truck.assignedDriver = driverRowToDriver(data.assigned_driver as CarrierDriverRow)
      }

      return truck
    }),

  /**
   * Create a new truck
   */
  createTruck: protectedProcedure
    .input(createTruckInputSchema)
    .mutation(async ({ ctx, input }) => {
      const truckInsert = {
        carrier_id: input.carrierId,
        assigned_driver_id: input.assignedDriverId || null,
        unit_number: input.unitNumber || null,
        vin: input.vin || null,
        license_plate: input.licensePlate || null,
        license_plate_state: input.licensePlateState || null,
        year: input.year || null,
        make: input.make || null,
        model: input.model || null,
        truck_type_id: input.truckTypeId || null,
        category: input.category || null,
        custom_type_description: input.customTypeDescription || null,
        deck_length_ft: input.deckLengthFt || null,
        deck_width_ft: input.deckWidthFt || null,
        deck_height_ft: input.deckHeightFt || null,
        well_length_ft: input.wellLengthFt || null,
        max_cargo_weight_lbs: input.maxCargoWeightLbs || null,
        tare_weight_lbs: input.tareWeightLbs || null,
        axle_count: input.axleCount || null,
        has_tarps: input.hasTarps ?? false,
        tarp_type: input.tarpType || null,
        has_chains: input.hasChains ?? false,
        chain_count: input.chainCount || null,
        has_straps: input.hasStraps ?? false,
        strap_count: input.strapCount || null,
        has_coil_racks: input.hasCoilRacks ?? false,
        has_load_bars: input.hasLoadBars ?? false,
        has_ramps: input.hasRamps ?? false,
        other_equipment: input.otherEquipment || null,
        registration_state: input.registrationState || null,
        registration_expiry: input.registrationExpiry || null,
        annual_inspection_date: input.annualInspectionDate || null,
        annual_inspection_expiry: input.annualInspectionExpiry || null,
        status: input.status ?? 'active',
        notes: input.notes || null,
        image_url: input.imageUrl || null,
      }

      const { data: newTruck, error } = await ctx.supabase
        .from('carrier_trucks')
        .insert(truckInsert)
        .select()
        .single()

      checkSupabaseError(error, 'Carrier truck')

      // Log activity
      await ctx.adminSupabase.from('activity_logs').insert({
        user_id: ctx.user.id,
        activity_type: 'truck_created',
        subject: `Truck ${input.unitNumber || 'New Truck'} added`,
        description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} added truck ${input.unitNumber || 'New Truck'}`.trim(),
        metadata: {
          truck_id: newTruck.id,
          carrier_id: input.carrierId,
        },
      })

      return { id: newTruck.id }
    }),

  /**
   * Update a truck
   */
  updateTruck: protectedProcedure
    .input(
      createTruckInputSchema.partial().omit({ carrierId: true }).extend({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input

      const truckUpdate: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }

      if (updateData.assignedDriverId !== undefined) truckUpdate.assigned_driver_id = updateData.assignedDriverId
      if (updateData.unitNumber !== undefined) truckUpdate.unit_number = updateData.unitNumber
      if (updateData.vin !== undefined) truckUpdate.vin = updateData.vin
      if (updateData.licensePlate !== undefined) truckUpdate.license_plate = updateData.licensePlate
      if (updateData.licensePlateState !== undefined) truckUpdate.license_plate_state = updateData.licensePlateState
      if (updateData.year !== undefined) truckUpdate.year = updateData.year
      if (updateData.make !== undefined) truckUpdate.make = updateData.make
      if (updateData.model !== undefined) truckUpdate.model = updateData.model
      if (updateData.truckTypeId !== undefined) truckUpdate.truck_type_id = updateData.truckTypeId
      if (updateData.category !== undefined) truckUpdate.category = updateData.category
      if (updateData.customTypeDescription !== undefined) truckUpdate.custom_type_description = updateData.customTypeDescription
      if (updateData.deckLengthFt !== undefined) truckUpdate.deck_length_ft = updateData.deckLengthFt
      if (updateData.deckWidthFt !== undefined) truckUpdate.deck_width_ft = updateData.deckWidthFt
      if (updateData.deckHeightFt !== undefined) truckUpdate.deck_height_ft = updateData.deckHeightFt
      if (updateData.wellLengthFt !== undefined) truckUpdate.well_length_ft = updateData.wellLengthFt
      if (updateData.maxCargoWeightLbs !== undefined) truckUpdate.max_cargo_weight_lbs = updateData.maxCargoWeightLbs
      if (updateData.tareWeightLbs !== undefined) truckUpdate.tare_weight_lbs = updateData.tareWeightLbs
      if (updateData.axleCount !== undefined) truckUpdate.axle_count = updateData.axleCount
      if (updateData.hasTarps !== undefined) truckUpdate.has_tarps = updateData.hasTarps
      if (updateData.tarpType !== undefined) truckUpdate.tarp_type = updateData.tarpType
      if (updateData.hasChains !== undefined) truckUpdate.has_chains = updateData.hasChains
      if (updateData.chainCount !== undefined) truckUpdate.chain_count = updateData.chainCount
      if (updateData.hasStraps !== undefined) truckUpdate.has_straps = updateData.hasStraps
      if (updateData.strapCount !== undefined) truckUpdate.strap_count = updateData.strapCount
      if (updateData.hasCoilRacks !== undefined) truckUpdate.has_coil_racks = updateData.hasCoilRacks
      if (updateData.hasLoadBars !== undefined) truckUpdate.has_load_bars = updateData.hasLoadBars
      if (updateData.hasRamps !== undefined) truckUpdate.has_ramps = updateData.hasRamps
      if (updateData.otherEquipment !== undefined) truckUpdate.other_equipment = updateData.otherEquipment
      if (updateData.registrationState !== undefined) truckUpdate.registration_state = updateData.registrationState
      if (updateData.registrationExpiry !== undefined) truckUpdate.registration_expiry = updateData.registrationExpiry
      if (updateData.annualInspectionDate !== undefined) truckUpdate.annual_inspection_date = updateData.annualInspectionDate
      if (updateData.annualInspectionExpiry !== undefined) truckUpdate.annual_inspection_expiry = updateData.annualInspectionExpiry
      if (updateData.status !== undefined) truckUpdate.status = updateData.status
      if (updateData.notes !== undefined) truckUpdate.notes = updateData.notes
      if (updateData.imageUrl !== undefined) truckUpdate.image_url = updateData.imageUrl

      const { error } = await ctx.supabase
        .from('carrier_trucks')
        .update(truckUpdate)
        .eq('id', id)

      checkSupabaseError(error, 'Carrier truck')

      return { success: true }
    }),

  /**
   * Soft delete a truck
   */
  deleteTruck: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('carrier_trucks')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', input.id)

      checkSupabaseError(error, 'Carrier truck')

      return { success: true }
    }),

  /**
   * Assign a driver to a truck
   */
  assignDriverToTruck: protectedProcedure
    .input(
      z.object({
        truckId: z.string().uuid(),
        driverId: z.string().uuid().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If assigning a driver, first unassign them from any other truck
      if (input.driverId) {
        await ctx.supabase
          .from('carrier_trucks')
          .update({ assigned_driver_id: null })
          .eq('assigned_driver_id', input.driverId)
      }

      // Now assign to the new truck
      const { error } = await ctx.supabase
        .from('carrier_trucks')
        .update({
          assigned_driver_id: input.driverId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.truckId)

      checkSupabaseError(error, 'Carrier truck')

      return { success: true }
    }),
})
