'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import {
  User,
  MapPin,
  Package,
  Truck,
  FileWarning,
  Settings,
  DollarSign,
  Edit,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import type { LoadPlan, LoadItem } from '@/lib/load-planner'
import type { AccessorialServices } from './ServicesSelector'

interface QuoteReviewProps {
  // Customer
  customerName: string
  customerEmail: string
  customerPhone: string
  customerCompany: string

  // Route
  pickupAddress: string
  pickupCity: string
  pickupState: string
  dropoffAddress: string
  dropoffCity: string
  dropoffState: string
  distanceMiles: number | null

  // Cargo
  cargoItems: LoadItem[]
  loadPlan: LoadPlan | null

  // Pricing
  lineHaulRate: number
  fuelSurcharge: number
  servicesTotal: number
  permitCosts?: number

  // Services
  services: AccessorialServices

  // Notes
  quoteNotes: string
  internalNotes: string

  // Actions
  onEditSection: (section: string) => void
  onSave: () => void
  onSaveAndPDF: () => void
  isSaving: boolean
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

function validateQuote(props: QuoteReviewProps): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!props.customerName) errors.push('Customer name is required')
  if (!props.pickupAddress) errors.push('Pickup address is required')
  if (!props.dropoffAddress) errors.push('Dropoff address is required')
  if (props.cargoItems.length === 0) errors.push('At least one cargo item is required')

  // Warnings (not blocking)
  if (!props.customerEmail) warnings.push('No customer email provided')
  if (props.lineHaulRate === 0) warnings.push('No pricing entered')
  if (!props.loadPlan) warnings.push('No trucks selected')

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

interface ReviewSectionProps {
  title: string
  icon: React.ReactNode
  onEdit: () => void
  children: React.ReactNode
}

function ReviewSection({ title, icon, onEdit, children }: ReviewSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function QuoteReview(props: QuoteReviewProps) {
  const {
    customerName,
    customerEmail,
    customerPhone,
    customerCompany,
    pickupAddress,
    pickupCity,
    pickupState,
    dropoffAddress,
    dropoffCity,
    dropoffState,
    distanceMiles,
    cargoItems,
    loadPlan,
    lineHaulRate,
    fuelSurcharge,
    servicesTotal,
    permitCosts = 0,
    services,
    quoteNotes,
    internalNotes,
    onEditSection,
    onSave,
    onSaveAndPDF,
    isSaving,
  } = props

  const validation = validateQuote(props)
  const grandTotal = lineHaulRate + fuelSurcharge + servicesTotal + permitCosts

  // Get selected services list
  const selectedServices = Object.entries(services)
    .filter(([key, value]) => value === true)
    .map(([key]) => {
      const labels: Record<string, string> = {
        insidePickup: 'Inside Pickup',
        liftgatePickup: 'Liftgate Pickup',
        residentialPickup: 'Residential Pickup',
        limitedAccessPickup: 'Limited Access Pickup',
        appointmentPickup: 'Appointment Pickup',
        insideDelivery: 'Inside Delivery',
        liftgateDelivery: 'Liftgate Delivery',
        residentialDelivery: 'Residential Delivery',
        limitedAccessDelivery: 'Limited Access Delivery',
        appointmentDelivery: 'Appointment Delivery',
        tarpService: 'Tarp Service',
        chainStrapService: 'Chain/Strap Service',
        driverAssist: 'Driver Assist',
        hazmatHandling: 'Hazmat Handling',
      }
      return labels[key] || key
    })

  return (
    <div className="space-y-4">
      {/* Customer Section */}
      <ReviewSection
        title="Customer"
        icon={<User className="h-4 w-4" />}
        onEdit={() => onEditSection('customer')}
      >
        <div className="space-y-1 text-sm">
          <div><span className="font-medium">Name:</span> {customerName || '-'}</div>
          <div><span className="font-medium">Email:</span> {customerEmail || '-'}</div>
          <div><span className="font-medium">Phone:</span> {customerPhone || '-'}</div>
          <div><span className="font-medium">Company:</span> {customerCompany || '-'}</div>
        </div>
      </ReviewSection>

      {/* Route Section */}
      <ReviewSection
        title="Route"
        icon={<MapPin className="h-4 w-4" />}
        onEdit={() => onEditSection('route')}
      >
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-green-600 font-medium">From:</span>{' '}
            {pickupAddress ? `${pickupCity || pickupAddress}${pickupState ? `, ${pickupState}` : ''}` : '-'}
          </div>
          <div>
            <span className="text-red-600 font-medium">To:</span>{' '}
            {dropoffAddress ? `${dropoffCity || dropoffAddress}${dropoffState ? `, ${dropoffState}` : ''}` : '-'}
          </div>
          {distanceMiles && (
            <div className="text-muted-foreground">
              Distance: {distanceMiles.toLocaleString()} miles
            </div>
          )}
        </div>
      </ReviewSection>

      {/* Cargo Section */}
      <ReviewSection
        title="Cargo"
        icon={<Package className="h-4 w-4" />}
        onEdit={() => onEditSection('cargo')}
      >
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Items:</span> {cargoItems.length}
            {loadPlan && (
              <span className="text-muted-foreground">
                {' '}&bull; {(loadPlan.totalWeight / 1000).toFixed(1)}k lbs
              </span>
            )}
          </div>
          {cargoItems.length > 0 && (
            <ul className="list-disc list-inside text-muted-foreground">
              {cargoItems.slice(0, 5).map((item, i) => (
                <li key={i}>
                  {item.description} ({item.quantity}) - {item.weight.toLocaleString()} lbs
                </li>
              ))}
              {cargoItems.length > 5 && (
                <li>... and {cargoItems.length - 5} more</li>
              )}
            </ul>
          )}
        </div>
      </ReviewSection>

      {/* Trucks Section */}
      <ReviewSection
        title="Trucks"
        icon={<Truck className="h-4 w-4" />}
        onEdit={() => onEditSection('trucks')}
      >
        {loadPlan && loadPlan.loads.length > 0 ? (
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Trucks Required:</span> {loadPlan.totalTrucks}
            </div>
            {loadPlan.loads.map((load, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Load {i + 1}
                </Badge>
                <span>{load.recommendedTruck?.name || 'Unknown'}</span>
                <span className="text-muted-foreground">
                  ({load.items.length} items, {(load.weight / 1000).toFixed(1)}k lbs)
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No trucks selected</div>
        )}
      </ReviewSection>

      {/* Permits Section */}
      <ReviewSection
        title="Permits"
        icon={<FileWarning className="h-4 w-4" />}
        onEdit={() => onEditSection('permits')}
      >
        {permitCosts > 0 ? (
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-medium">Estimated Permit Costs:</span>{' '}
              {formatCurrency(permitCosts * 100)}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No permit costs calculated
          </div>
        )}
      </ReviewSection>

      {/* Services Section */}
      <ReviewSection
        title="Services"
        icon={<Settings className="h-4 w-4" />}
        onEdit={() => onEditSection('services')}
      >
        {selectedServices.length > 0 ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-1">
              {selectedServices.map((service, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {service}
                </Badge>
              ))}
            </div>
            <div>
              <span className="font-medium">Services Total:</span>{' '}
              {formatCurrency(servicesTotal * 100)}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No services selected</div>
        )}
      </ReviewSection>

      {/* Pricing Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Line Haul</span>
            <span className="font-mono">{formatCurrency(lineHaulRate * 100)}</span>
          </div>
          {fuelSurcharge > 0 && (
            <div className="flex justify-between text-sm">
              <span>Fuel Surcharge</span>
              <span className="font-mono">{formatCurrency(fuelSurcharge * 100)}</span>
            </div>
          )}
          {permitCosts > 0 && (
            <div className="flex justify-between text-sm">
              <span>Permits & Escorts</span>
              <span className="font-mono">{formatCurrency(permitCosts * 100)}</span>
            </div>
          )}
          {servicesTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span>Services</span>
              <span className="font-mono">{formatCurrency(servicesTotal * 100)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Grand Total</span>
            <span className="text-lg font-bold font-mono text-primary">
              {formatCurrency(grandTotal * 100)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Validation */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {validation.errors.map((error, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            ))}
            {validation.warnings.map((warning, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                {warning}
              </div>
            ))}
            {validation.isValid && validation.warnings.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                All required fields are complete
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {(quoteNotes || internalNotes) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {quoteNotes && (
              <div>
                <span className="font-medium">Quote Notes:</span>
                <p className="text-muted-foreground mt-1">{quoteNotes}</p>
              </div>
            )}
            {internalNotes && (
              <div>
                <span className="font-medium">Internal Notes:</span>
                <p className="text-muted-foreground mt-1">{internalNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={onSave}
          disabled={!validation.isValid || isSaving}
          className="flex-1"
        >
          {isSaving ? 'Saving...' : 'Save Quote'}
        </Button>
        <Button
          onClick={onSaveAndPDF}
          disabled={!validation.isValid || isSaving}
          variant="outline"
        >
          Save & View PDF
        </Button>
      </div>
    </div>
  )
}
