'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'

export interface AccessorialServices {
  // Pickup services
  insidePickup: boolean
  liftgatePickup: boolean
  residentialPickup: boolean
  limitedAccessPickup: boolean
  appointmentPickup: boolean

  // Delivery services
  insideDelivery: boolean
  liftgateDelivery: boolean
  residentialDelivery: boolean
  limitedAccessDelivery: boolean
  appointmentDelivery: boolean

  // Additional services
  tarpService: boolean
  chainStrapService: boolean
  driverAssist: boolean
  hazmatHandling: boolean

  // Variable rate services
  detentionHours: number
  detentionRate: number
  layoverDays: number
  layoverRate: number
  storageDays: number
  storageRate: number
}

export const DEFAULT_SERVICES: AccessorialServices = {
  insidePickup: false,
  liftgatePickup: false,
  residentialPickup: false,
  limitedAccessPickup: false,
  appointmentPickup: false,
  insideDelivery: false,
  liftgateDelivery: false,
  residentialDelivery: false,
  limitedAccessDelivery: false,
  appointmentDelivery: false,
  tarpService: false,
  chainStrapService: false,
  driverAssist: false,
  hazmatHandling: false,
  detentionHours: 0,
  detentionRate: 75,
  layoverDays: 0,
  layoverRate: 350,
  storageDays: 0,
  storageRate: 50,
}

// Service rates in dollars
const SERVICE_RATES = {
  insidePickup: 125,
  liftgatePickup: 85,
  residentialPickup: 75,
  limitedAccessPickup: 75,
  appointmentPickup: 35,
  insideDelivery: 125,
  liftgateDelivery: 85,
  residentialDelivery: 75,
  limitedAccessDelivery: 75,
  appointmentDelivery: 35,
  tarpService: 100,
  chainStrapService: 50,
  driverAssist: 35,
  hazmatHandling: 250,
}

interface ServicesSelectorProps {
  services: AccessorialServices
  onServicesChange: (services: AccessorialServices) => void
}

interface ServiceToggleProps {
  label: string
  description: string
  rate: number
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function ServiceToggle({ label, description, rate, checked, onCheckedChange }: ServiceToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
        <div>
          <Label className="font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="text-sm font-mono">
        {formatCurrency(rate * 100)}
      </div>
    </div>
  )
}

export function ServicesSelector({ services, onServicesChange }: ServicesSelectorProps) {
  const updateService = <K extends keyof AccessorialServices>(
    key: K,
    value: AccessorialServices[K]
  ) => {
    onServicesChange({ ...services, [key]: value })
  }

  // Calculate total
  const calculateTotal = () => {
    let total = 0

    // Pickup services
    if (services.insidePickup) total += SERVICE_RATES.insidePickup
    if (services.liftgatePickup) total += SERVICE_RATES.liftgatePickup
    if (services.residentialPickup) total += SERVICE_RATES.residentialPickup
    if (services.limitedAccessPickup) total += SERVICE_RATES.limitedAccessPickup
    if (services.appointmentPickup) total += SERVICE_RATES.appointmentPickup

    // Delivery services
    if (services.insideDelivery) total += SERVICE_RATES.insideDelivery
    if (services.liftgateDelivery) total += SERVICE_RATES.liftgateDelivery
    if (services.residentialDelivery) total += SERVICE_RATES.residentialDelivery
    if (services.limitedAccessDelivery) total += SERVICE_RATES.limitedAccessDelivery
    if (services.appointmentDelivery) total += SERVICE_RATES.appointmentDelivery

    // Additional services
    if (services.tarpService) total += SERVICE_RATES.tarpService
    if (services.chainStrapService) total += SERVICE_RATES.chainStrapService
    if (services.driverAssist) total += SERVICE_RATES.driverAssist
    if (services.hazmatHandling) total += SERVICE_RATES.hazmatHandling

    // Variable rate services
    total += services.detentionHours * services.detentionRate
    total += services.layoverDays * services.layoverRate
    total += services.storageDays * services.storageRate

    return total
  }

  const total = calculateTotal()

  return (
    <div className="space-y-4">
      {/* Pickup Services */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pickup Services</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceToggle
            label="Inside Pickup"
            description="Driver carries items inside"
            rate={SERVICE_RATES.insidePickup}
            checked={services.insidePickup}
            onCheckedChange={(v) => updateService('insidePickup', v)}
          />
          <ServiceToggle
            label="Liftgate at Pickup"
            description="Hydraulic lift for loading"
            rate={SERVICE_RATES.liftgatePickup}
            checked={services.liftgatePickup}
            onCheckedChange={(v) => updateService('liftgatePickup', v)}
          />
          <ServiceToggle
            label="Residential Pickup"
            description="Non-commercial location"
            rate={SERVICE_RATES.residentialPickup}
            checked={services.residentialPickup}
            onCheckedChange={(v) => updateService('residentialPickup', v)}
          />
          <ServiceToggle
            label="Limited Access Pickup"
            description="Construction site, fair, etc."
            rate={SERVICE_RATES.limitedAccessPickup}
            checked={services.limitedAccessPickup}
            onCheckedChange={(v) => updateService('limitedAccessPickup', v)}
          />
          <ServiceToggle
            label="Appointment Required"
            description="Scheduled pickup time"
            rate={SERVICE_RATES.appointmentPickup}
            checked={services.appointmentPickup}
            onCheckedChange={(v) => updateService('appointmentPickup', v)}
          />
        </CardContent>
      </Card>

      {/* Delivery Services */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Delivery Services</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceToggle
            label="Inside Delivery"
            description="Driver carries items inside"
            rate={SERVICE_RATES.insideDelivery}
            checked={services.insideDelivery}
            onCheckedChange={(v) => updateService('insideDelivery', v)}
          />
          <ServiceToggle
            label="Liftgate at Delivery"
            description="Hydraulic lift for unloading"
            rate={SERVICE_RATES.liftgateDelivery}
            checked={services.liftgateDelivery}
            onCheckedChange={(v) => updateService('liftgateDelivery', v)}
          />
          <ServiceToggle
            label="Residential Delivery"
            description="Non-commercial location"
            rate={SERVICE_RATES.residentialDelivery}
            checked={services.residentialDelivery}
            onCheckedChange={(v) => updateService('residentialDelivery', v)}
          />
          <ServiceToggle
            label="Limited Access Delivery"
            description="Construction site, fair, etc."
            rate={SERVICE_RATES.limitedAccessDelivery}
            checked={services.limitedAccessDelivery}
            onCheckedChange={(v) => updateService('limitedAccessDelivery', v)}
          />
          <ServiceToggle
            label="Appointment Required"
            description="Scheduled delivery time"
            rate={SERVICE_RATES.appointmentDelivery}
            checked={services.appointmentDelivery}
            onCheckedChange={(v) => updateService('appointmentDelivery', v)}
          />
        </CardContent>
      </Card>

      {/* Additional Services */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Additional Services</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceToggle
            label="Tarp Service"
            description="Protect cargo from weather"
            rate={SERVICE_RATES.tarpService}
            checked={services.tarpService}
            onCheckedChange={(v) => updateService('tarpService', v)}
          />
          <ServiceToggle
            label="Chain/Strap Service"
            description="Extra securement"
            rate={SERVICE_RATES.chainStrapService}
            checked={services.chainStrapService}
            onCheckedChange={(v) => updateService('chainStrapService', v)}
          />
          <ServiceToggle
            label="Driver Assist"
            description="Help with loading/unloading"
            rate={SERVICE_RATES.driverAssist}
            checked={services.driverAssist}
            onCheckedChange={(v) => updateService('driverAssist', v)}
          />
          <ServiceToggle
            label="Hazmat Handling"
            description="Hazardous materials"
            rate={SERVICE_RATES.hazmatHandling}
            checked={services.hazmatHandling}
            onCheckedChange={(v) => updateService('hazmatHandling', v)}
          />
        </CardContent>
      </Card>

      {/* Variable Rate Services */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Variable Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Detention */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label>Detention</Label>
              <p className="text-xs text-muted-foreground">Waiting time after free hours</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-16 text-center"
                value={services.detentionHours || ''}
                onChange={(e) => updateService('detentionHours', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">hrs @</span>
              <div className="relative w-20">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  className="pl-5 text-center"
                  value={services.detentionRate || ''}
                  onChange={(e) => updateService('detentionRate', parseFloat(e.target.value) || 0)}
                />
              </div>
              <span className="text-sm text-muted-foreground">/hr</span>
            </div>
            <div className="w-24 text-right font-mono text-sm">
              {formatCurrency((services.detentionHours * services.detentionRate) * 100)}
            </div>
          </div>

          {/* Layover */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label>Layover</Label>
              <p className="text-xs text-muted-foreground">Overnight waiting</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-16 text-center"
                value={services.layoverDays || ''}
                onChange={(e) => updateService('layoverDays', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">days @</span>
              <div className="relative w-20">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  className="pl-5 text-center"
                  value={services.layoverRate || ''}
                  onChange={(e) => updateService('layoverRate', parseFloat(e.target.value) || 0)}
                />
              </div>
              <span className="text-sm text-muted-foreground">/day</span>
            </div>
            <div className="w-24 text-right font-mono text-sm">
              {formatCurrency((services.layoverDays * services.layoverRate) * 100)}
            </div>
          </div>

          {/* Storage */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label>Storage</Label>
              <p className="text-xs text-muted-foreground">Warehouse storage</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-16 text-center"
                value={services.storageDays || ''}
                onChange={(e) => updateService('storageDays', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">days @</span>
              <div className="relative w-20">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  className="pl-5 text-center"
                  value={services.storageRate || ''}
                  onChange={(e) => updateService('storageRate', parseFloat(e.target.value) || 0)}
                />
              </div>
              <span className="text-sm text-muted-foreground">/day</span>
            </div>
            <div className="w-24 text-right font-mono text-sm">
              {formatCurrency((services.storageDays * services.storageRate) * 100)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Services Total</span>
            <span className="text-xl font-bold font-mono text-primary">
              {formatCurrency(total * 100)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper to calculate total from services object
export function calculateServicesTotal(services: AccessorialServices): number {
  let total = 0

  if (services.insidePickup) total += SERVICE_RATES.insidePickup
  if (services.liftgatePickup) total += SERVICE_RATES.liftgatePickup
  if (services.residentialPickup) total += SERVICE_RATES.residentialPickup
  if (services.limitedAccessPickup) total += SERVICE_RATES.limitedAccessPickup
  if (services.appointmentPickup) total += SERVICE_RATES.appointmentPickup
  if (services.insideDelivery) total += SERVICE_RATES.insideDelivery
  if (services.liftgateDelivery) total += SERVICE_RATES.liftgateDelivery
  if (services.residentialDelivery) total += SERVICE_RATES.residentialDelivery
  if (services.limitedAccessDelivery) total += SERVICE_RATES.limitedAccessDelivery
  if (services.appointmentDelivery) total += SERVICE_RATES.appointmentDelivery
  if (services.tarpService) total += SERVICE_RATES.tarpService
  if (services.chainStrapService) total += SERVICE_RATES.chainStrapService
  if (services.driverAssist) total += SERVICE_RATES.driverAssist
  if (services.hazmatHandling) total += SERVICE_RATES.hazmatHandling
  total += services.detentionHours * services.detentionRate
  total += services.layoverDays * services.layoverRate
  total += services.storageDays * services.storageRate

  return total
}
