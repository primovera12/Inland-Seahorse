'use client'

import { useState, use, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { trpc } from '@/lib/trpc/client'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  User,
  Users,
  Truck,
  Phone,
  Mail,
  MapPin,
  Shield,
  CreditCard,
  FileText,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  AlertTriangle,
  CheckSquare,
  Star,
  Pause,
  Ban,
  Calendar,
  IdCard,
  Stethoscope,
  Wrench,
  Loader2,
  Save,
  X,
  ArrowRight,
  History,
  DollarSign,
} from 'lucide-react'
import type {
  CarrierType,
  CarrierStatus,
  DriverStatus,
  TruckStatus,
  PaymentMethod,
  CDLClass,
  CarrierDriver,
  CarrierTruck,
} from '@/types/carriers'
import { getMarginColor } from '@/types/load-history'
import {
  CARRIER_TYPE_LABELS,
  CARRIER_STATUS_LABELS,
  DRIVER_STATUS_LABELS,
  TRUCK_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  getTruckDisplayName,
} from '@/types/carriers'

const STATUS_COLORS: Record<CarrierStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  preferred: 'bg-blue-100 text-blue-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  blacklisted: 'bg-red-100 text-red-800',
}

const DRIVER_STATUS_COLORS: Record<DriverStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  on_leave: 'bg-yellow-100 text-yellow-800',
}

const TRUCK_STATUS_COLORS: Record<TruckStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  out_of_service: 'bg-red-100 text-red-800',
  sold: 'bg-orange-100 text-orange-800',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function CarrierDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditing = searchParams.get('edit') === 'true'

  const [activeTab, setActiveTab] = useState('overview')
  const [showDriverDialog, setShowDriverDialog] = useState(false)
  const [showTruckDialog, setShowTruckDialog] = useState(false)
  const [editingDriver, setEditingDriver] = useState<CarrierDriver | null>(null)
  const [editingTruck, setEditingTruck] = useState<CarrierTruck | null>(null)

  // Form states for carrier edit
  const [editForm, setEditForm] = useState({
    companyName: '',
    mcNumber: '',
    dotNumber: '',
    einTaxId: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
    primaryContactName: '',
    primaryContactPhone: '',
    primaryContactEmail: '',
    billingEmail: '',
    paymentTermsDays: 30,
    preferredPaymentMethod: '' as PaymentMethod | '',
    factoringCompanyName: '',
    factoringCompanyPhone: '',
    factoringCompanyEmail: '',
    insuranceCompany: '',
    insurancePolicyNumber: '',
    insuranceExpiry: '',
    cargoInsuranceLimitCents: 0,
    notes: '',
  })

  // Driver form state
  const [driverForm, setDriverForm] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    phone: '',
    phoneSecondary: '',
    email: '',
    cdlNumber: '',
    cdlState: '',
    cdlClass: '' as CDLClass | '',
    cdlExpiry: '',
    cdlEndorsements: '',
    medicalCardExpiry: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    notes: '',
    isOwner: false,
  })

  // Truck form state
  const [truckForm, setTruckForm] = useState({
    unitNumber: '',
    vin: '',
    licensePlate: '',
    licensePlateState: '',
    year: '',
    make: '',
    model: '',
    category: '',
    deckLengthFt: '',
    maxCargoWeightLbs: '',
    hasTarps: false,
    hasChains: false,
    hasStraps: false,
    notes: '',
    assignedDriverId: '' as string | null,
  })

  // Fetch carrier data
  const { data: carrier, isLoading, error } = trpc.carriers.getById.useQuery(
    { id: resolvedParams.id }
  )

  // Populate edit form when carrier data loads
  useEffect(() => {
    if (carrier) {
      setEditForm({
        companyName: carrier.companyName || '',
        mcNumber: carrier.mcNumber || '',
        dotNumber: carrier.dotNumber || '',
        einTaxId: carrier.einTaxId || '',
        addressLine1: carrier.addressLine1 || '',
        addressLine2: carrier.addressLine2 || '',
        city: carrier.city || '',
        state: carrier.state || '',
        zip: carrier.zip || '',
        primaryContactName: carrier.primaryContactName || '',
        primaryContactPhone: carrier.primaryContactPhone || '',
        primaryContactEmail: carrier.primaryContactEmail || '',
        billingEmail: carrier.billingEmail || '',
        paymentTermsDays: carrier.paymentTermsDays || 30,
        preferredPaymentMethod: carrier.preferredPaymentMethod || '',
        factoringCompanyName: carrier.factoringCompanyName || '',
        factoringCompanyPhone: carrier.factoringCompanyPhone || '',
        factoringCompanyEmail: carrier.factoringCompanyEmail || '',
        insuranceCompany: carrier.insuranceCompany || '',
        insurancePolicyNumber: carrier.insurancePolicyNumber || '',
        insuranceExpiry: carrier.insuranceExpiry
          ? new Date(carrier.insuranceExpiry).toISOString().split('T')[0]
          : '',
        cargoInsuranceLimitCents: carrier.cargoInsuranceLimitCents || 0,
        notes: carrier.notes || '',
      })
    }
  }, [carrier])

  // Fetch load history for this carrier
  const { data: loadHistoryData, isLoading: loadHistoryLoading } = trpc.loadHistory.getByCarrier.useQuery(
    { carrierId: resolvedParams.id },
    { enabled: !!resolvedParams.id }
  )

  const utils = trpc.useUtils()

  // Mutations
  const updateCarrier = trpc.carriers.update.useMutation({
    onSuccess: () => {
      utils.carriers.getById.invalidate({ id: resolvedParams.id })
      toast.success('Carrier updated')
      router.push(`/carriers/${resolvedParams.id}`)
    },
    onError: (error) => {
      toast.error('Failed to update carrier', { description: error.message })
    },
  })

  const deleteCarrier = trpc.carriers.delete.useMutation({
    onSuccess: () => {
      toast.success('Carrier deleted')
      router.push('/carriers')
    },
    onError: (error) => {
      toast.error('Failed to delete carrier', { description: error.message })
    },
  })

  const createDriver = trpc.carriers.createDriver.useMutation({
    onSuccess: () => {
      utils.carriers.getById.invalidate({ id: resolvedParams.id })
      toast.success('Driver added')
      setShowDriverDialog(false)
      resetDriverForm()
    },
    onError: (error) => {
      toast.error('Failed to add driver', { description: error.message })
    },
  })

  const updateDriver = trpc.carriers.updateDriver.useMutation({
    onSuccess: () => {
      utils.carriers.getById.invalidate({ id: resolvedParams.id })
      toast.success('Driver updated')
      setShowDriverDialog(false)
      setEditingDriver(null)
      resetDriverForm()
    },
    onError: (error) => {
      toast.error('Failed to update driver', { description: error.message })
    },
  })

  const deleteDriver = trpc.carriers.deleteDriver.useMutation({
    onSuccess: () => {
      utils.carriers.getById.invalidate({ id: resolvedParams.id })
      toast.success('Driver removed')
    },
    onError: (error) => {
      toast.error('Failed to remove driver', { description: error.message })
    },
  })

  const createTruck = trpc.carriers.createTruck.useMutation({
    onSuccess: () => {
      utils.carriers.getById.invalidate({ id: resolvedParams.id })
      toast.success('Truck added')
      setShowTruckDialog(false)
      resetTruckForm()
    },
    onError: (error) => {
      toast.error('Failed to add truck', { description: error.message })
    },
  })

  const updateTruck = trpc.carriers.updateTruck.useMutation({
    onSuccess: () => {
      utils.carriers.getById.invalidate({ id: resolvedParams.id })
      toast.success('Truck updated')
      setShowTruckDialog(false)
      setEditingTruck(null)
      resetTruckForm()
    },
    onError: (error) => {
      toast.error('Failed to update truck', { description: error.message })
    },
  })

  const deleteTruck = trpc.carriers.deleteTruck.useMutation({
    onSuccess: () => {
      utils.carriers.getById.invalidate({ id: resolvedParams.id })
      toast.success('Truck removed')
    },
    onError: (error) => {
      toast.error('Failed to remove truck', { description: error.message })
    },
  })

  const assignDriver = trpc.carriers.assignDriverToTruck.useMutation({
    onSuccess: () => {
      utils.carriers.getById.invalidate({ id: resolvedParams.id })
      toast.success('Driver assigned')
    },
    onError: (error) => {
      toast.error('Failed to assign driver', { description: error.message })
    },
  })

  const resetDriverForm = () => {
    setDriverForm({
      firstName: '',
      lastName: '',
      nickname: '',
      phone: '',
      phoneSecondary: '',
      email: '',
      cdlNumber: '',
      cdlState: '',
      cdlClass: '',
      cdlExpiry: '',
      cdlEndorsements: '',
      medicalCardExpiry: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      notes: '',
      isOwner: false,
    })
  }

  const resetTruckForm = () => {
    setTruckForm({
      unitNumber: '',
      vin: '',
      licensePlate: '',
      licensePlateState: '',
      year: '',
      make: '',
      model: '',
      category: '',
      deckLengthFt: '',
      maxCargoWeightLbs: '',
      hasTarps: false,
      hasChains: false,
      hasStraps: false,
      notes: '',
      assignedDriverId: null,
    })
  }

  const openDriverDialog = (driver?: CarrierDriver) => {
    if (driver) {
      setEditingDriver(driver)
      setDriverForm({
        firstName: driver.firstName,
        lastName: driver.lastName,
        nickname: driver.nickname || '',
        phone: driver.phone || '',
        phoneSecondary: driver.phoneSecondary || '',
        email: driver.email || '',
        cdlNumber: driver.cdlNumber || '',
        cdlState: driver.cdlState || '',
        cdlClass: driver.cdlClass || '',
        cdlExpiry: driver.cdlExpiry
          ? new Date(driver.cdlExpiry).toISOString().split('T')[0]
          : '',
        cdlEndorsements: driver.cdlEndorsements || '',
        medicalCardExpiry: driver.medicalCardExpiry
          ? new Date(driver.medicalCardExpiry).toISOString().split('T')[0]
          : '',
        emergencyContactName: driver.emergencyContactName || '',
        emergencyContactPhone: driver.emergencyContactPhone || '',
        emergencyContactRelationship: driver.emergencyContactRelationship || '',
        notes: driver.notes || '',
        isOwner: driver.isOwner,
      })
    } else {
      setEditingDriver(null)
      resetDriverForm()
    }
    setShowDriverDialog(true)
  }

  const openTruckDialog = (truck?: CarrierTruck) => {
    if (truck) {
      setEditingTruck(truck)
      setTruckForm({
        unitNumber: truck.unitNumber || '',
        vin: truck.vin || '',
        licensePlate: truck.licensePlate || '',
        licensePlateState: truck.licensePlateState || '',
        year: truck.year?.toString() || '',
        make: truck.make || '',
        model: truck.model || '',
        category: truck.category || '',
        deckLengthFt: truck.deckLengthFt?.toString() || '',
        maxCargoWeightLbs: truck.maxCargoWeightLbs?.toString() || '',
        hasTarps: truck.hasTarps,
        hasChains: truck.hasChains,
        hasStraps: truck.hasStraps,
        notes: truck.notes || '',
        assignedDriverId: truck.assignedDriverId,
      })
    } else {
      setEditingTruck(null)
      resetTruckForm()
    }
    setShowTruckDialog(true)
  }

  const handleSaveCarrier = () => {
    updateCarrier.mutate({
      id: resolvedParams.id,
      companyName: editForm.companyName || undefined,
      mcNumber: editForm.mcNumber || undefined,
      dotNumber: editForm.dotNumber || undefined,
      einTaxId: editForm.einTaxId || undefined,
      addressLine1: editForm.addressLine1 || undefined,
      addressLine2: editForm.addressLine2 || undefined,
      city: editForm.city || undefined,
      state: editForm.state || undefined,
      zip: editForm.zip || undefined,
      primaryContactName: editForm.primaryContactName || undefined,
      primaryContactPhone: editForm.primaryContactPhone || undefined,
      primaryContactEmail: editForm.primaryContactEmail || undefined,
      billingEmail: editForm.billingEmail || undefined,
      paymentTermsDays: editForm.paymentTermsDays,
      preferredPaymentMethod: editForm.preferredPaymentMethod || undefined,
      factoringCompanyName: editForm.factoringCompanyName || undefined,
      factoringCompanyPhone: editForm.factoringCompanyPhone || undefined,
      factoringCompanyEmail: editForm.factoringCompanyEmail || undefined,
      insuranceCompany: editForm.insuranceCompany || undefined,
      insurancePolicyNumber: editForm.insurancePolicyNumber || undefined,
      insuranceExpiry: editForm.insuranceExpiry || undefined,
      cargoInsuranceLimitCents: editForm.cargoInsuranceLimitCents || undefined,
      notes: editForm.notes || undefined,
    })
  }

  const handleSaveDriver = () => {
    const driverData = {
      firstName: driverForm.firstName,
      lastName: driverForm.lastName,
      nickname: driverForm.nickname || undefined,
      phone: driverForm.phone || undefined,
      phoneSecondary: driverForm.phoneSecondary || undefined,
      email: driverForm.email || undefined,
      cdlNumber: driverForm.cdlNumber || undefined,
      cdlState: driverForm.cdlState || undefined,
      cdlClass: (driverForm.cdlClass as CDLClass) || undefined,
      cdlExpiry: driverForm.cdlExpiry || undefined,
      cdlEndorsements: driverForm.cdlEndorsements || undefined,
      medicalCardExpiry: driverForm.medicalCardExpiry || undefined,
      emergencyContactName: driverForm.emergencyContactName || undefined,
      emergencyContactPhone: driverForm.emergencyContactPhone || undefined,
      emergencyContactRelationship: driverForm.emergencyContactRelationship || undefined,
      notes: driverForm.notes || undefined,
      isOwner: driverForm.isOwner,
    }

    if (editingDriver) {
      updateDriver.mutate({ id: editingDriver.id, ...driverData })
    } else {
      createDriver.mutate({ carrierId: resolvedParams.id, ...driverData })
    }
  }

  const handleSaveTruck = () => {
    const truckData = {
      unitNumber: truckForm.unitNumber || undefined,
      vin: truckForm.vin || undefined,
      licensePlate: truckForm.licensePlate || undefined,
      licensePlateState: truckForm.licensePlateState || undefined,
      year: truckForm.year ? parseInt(truckForm.year) : undefined,
      make: truckForm.make || undefined,
      model: truckForm.model || undefined,
      category: truckForm.category || undefined,
      deckLengthFt: truckForm.deckLengthFt ? parseFloat(truckForm.deckLengthFt) : undefined,
      maxCargoWeightLbs: truckForm.maxCargoWeightLbs
        ? parseInt(truckForm.maxCargoWeightLbs)
        : undefined,
      hasTarps: truckForm.hasTarps,
      hasChains: truckForm.hasChains,
      hasStraps: truckForm.hasStraps,
      notes: truckForm.notes || undefined,
      assignedDriverId: truckForm.assignedDriverId || undefined,
    }

    if (editingTruck) {
      updateTruck.mutate({ id: editingTruck.id, ...truckData })
    } else {
      createTruck.mutate({ carrierId: resolvedParams.id, ...truckData })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !carrier) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Failed to load carrier</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/carriers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Carriers
        </Button>
      </div>
    )
  }

  const isInsuranceExpiring = () => {
    if (!carrier.insuranceExpiry) return false
    const now = new Date()
    const expiry = new Date(carrier.insuranceExpiry)
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays > 0 && diffDays <= 30
  }

  const isInsuranceExpired = () => {
    if (!carrier.insuranceExpiry) return false
    return new Date(carrier.insuranceExpiry) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/carriers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {carrier.companyName || 'Unnamed Carrier'}
              </h1>
              <Badge className={STATUS_COLORS[carrier.status]}>
                {CARRIER_STATUS_LABELS[carrier.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                {carrier.carrierType === 'company' ? (
                  <Building2 className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                {CARRIER_TYPE_LABELS[carrier.carrierType]}
              </span>
              {carrier.mcNumber && <span>MC# {carrier.mcNumber}</span>}
              {carrier.dotNumber && <span>DOT# {carrier.dotNumber}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 ml-12 sm:ml-0">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => router.push(`/carriers/${resolvedParams.id}`)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveCarrier} disabled={updateCarrier.isPending}>
                {updateCarrier.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/carriers/${resolvedParams.id}?edit=true`)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this carrier?')) {
                        deleteCarrier.mutate({ id: resolvedParams.id })
                      }
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Carrier
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="drivers">
            Drivers ({carrier.drivers.length})
          </TabsTrigger>
          <TabsTrigger value="trucks">
            Trucks ({carrier.trucks.length})
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {isEditing ? (
            <CarrierEditForm form={editForm} setForm={setEditForm} carrier={carrier} />
          ) : (
            <CarrierOverview carrier={carrier} />
          )}
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Drivers</h3>
            <Button onClick={() => openDriverDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </div>

          {carrier.drivers.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No drivers added yet</p>
                <Button variant="outline" className="mt-4" onClick={() => openDriverDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Driver
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>CDL</TableHead>
                    <TableHead>Medical Card</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carrier.drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {driver.firstName} {driver.lastName}
                            {driver.isOwner && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Owner
                              </Badge>
                            )}
                          </p>
                          {driver.nickname && (
                            <p className="text-sm text-muted-foreground">"{driver.nickname}"</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {driver.phone && (
                            <p className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {driver.phone}
                            </p>
                          )}
                          {driver.email && (
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" /> {driver.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {driver.cdlNumber ? (
                            <>
                              <p className="flex items-center gap-1">
                                <IdCard className="h-3 w-3" />
                                {driver.cdlNumber}
                                {driver.cdlClass && ` (Class ${driver.cdlClass})`}
                              </p>
                              {driver.cdlExpiry && (
                                <p
                                  className={`text-muted-foreground ${
                                    new Date(driver.cdlExpiry) < new Date()
                                      ? 'text-red-600'
                                      : ''
                                  }`}
                                >
                                  Exp: {formatDate(driver.cdlExpiry)}
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {driver.medicalCardExpiry ? (
                          <div
                            className={`flex items-center gap-1 text-sm ${
                              new Date(driver.medicalCardExpiry) < new Date()
                                ? 'text-red-600'
                                : ''
                            }`}
                          >
                            <Stethoscope className="h-3 w-3" />
                            {formatDate(driver.medicalCardExpiry)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={DRIVER_STATUS_COLORS[driver.status]}>
                          {DRIVER_STATUS_LABELS[driver.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDriverDialog(driver)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm('Remove this driver?')) {
                                  deleteDriver.mutate({ id: driver.id })
                                }
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Trucks Tab */}
        <TabsContent value="trucks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Trucks</h3>
            <Button onClick={() => openTruckDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Truck
            </Button>
          </div>

          {carrier.trucks.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No trucks added yet</p>
                <Button variant="outline" className="mt-4" onClick={() => openTruckDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Truck
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {carrier.trucks.map((truck) => (
                <Card key={truck.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{getTruckDisplayName(truck)}</CardTitle>
                        {truck.category && (
                          <CardDescription>{truck.category}</CardDescription>
                        )}
                      </div>
                      <Badge className={TRUCK_STATUS_COLORS[truck.status]}>
                        {TRUCK_STATUS_LABELS[truck.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {truck.licensePlate && (
                        <div>
                          <span className="text-muted-foreground">Plate:</span>
                          <p className="font-medium">
                            {truck.licensePlate}
                            {truck.licensePlateState && ` (${truck.licensePlateState})`}
                          </p>
                        </div>
                      )}
                      {truck.deckLengthFt && (
                        <div>
                          <span className="text-muted-foreground">Deck:</span>
                          <p className="font-medium">{truck.deckLengthFt}' L</p>
                        </div>
                      )}
                      {truck.maxCargoWeightLbs && (
                        <div>
                          <span className="text-muted-foreground">Max Weight:</span>
                          <p className="font-medium">
                            {truck.maxCargoWeightLbs.toLocaleString()} lbs
                          </p>
                        </div>
                      )}
                    </div>

                    {truck.assignedDriver && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {truck.assignedDriver.firstName} {truck.assignedDriver.lastName}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {truck.hasTarps && <Badge variant="outline">Tarps</Badge>}
                      {truck.hasChains && <Badge variant="outline">Chains</Badge>}
                      {truck.hasStraps && <Badge variant="outline">Straps</Badge>}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => openTruckDialog(truck)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Remove this truck?')) {
                            deleteTruck.mutate({ id: truck.id })
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {loadHistoryLoading ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                <p className="text-muted-foreground mt-2">Loading load history...</p>
              </CardContent>
            </Card>
          ) : !loadHistoryData?.data || loadHistoryData.data.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No loads recorded yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Loads assigned to this carrier will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Loads</p>
                    <p className="text-2xl font-bold">{loadHistoryData.total}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        loadHistoryData.data.reduce((sum, l) => sum + (l.customerRateCents || 0), 0)
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        loadHistoryData.data.reduce((sum, l) => sum + (l.carrierRateCents || 0), 0)
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Avg Margin</p>
                    <p className="text-2xl font-bold">
                      {(() => {
                        const loads = loadHistoryData.data.filter((l) => l.marginPercentage != null)
                        if (loads.length === 0) return '-'
                        const avg = loads.reduce((sum, l) => sum + (l.marginPercentage || 0), 0) / loads.length
                        return `${avg.toFixed(1)}%`
                      })()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Load History List */}
              <Card>
                <CardHeader>
                  <CardTitle>Load History</CardTitle>
                  <CardDescription>All loads assigned to this carrier</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {loadHistoryData.data.map((load) => (
                      <div
                        key={load.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">
                                {load.quoteNumber || 'N/A'}
                              </span>
                              <Badge
                                variant="outline"
                                className={getMarginColor(load.marginPercentage)}
                              >
                                {load.marginPercentage != null
                                  ? `${load.marginPercentage.toFixed(1)}%`
                                  : '-'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {load.originCity}, {load.originState}
                              <ArrowRight className="h-3 w-3" />
                              {load.destinationCity}, {load.destinationState}
                            </p>
                            {load.cargoDescription && (
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {load.cargoDescription}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-right">
                              <p className="text-muted-foreground">Rate</p>
                              <p className="font-mono font-medium">
                                {load.carrierRateCents
                                  ? formatCurrency(load.carrierRateCents)
                                  : '-'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-muted-foreground">Date</p>
                              <p className="font-medium">
                                {load.pickupDate ? formatDate(load.pickupDate) : '-'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Link to full history */}
              <div className="text-center">
                <Button variant="outline" asChild>
                  <Link href={`/load-history?carrierId=${resolvedParams.id}`}>
                    View Full Load History
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Driver Dialog */}
      <Dialog open={showDriverDialog} onOpenChange={setShowDriverDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add Driver'}</DialogTitle>
            <DialogDescription>
              {editingDriver ? 'Update driver information' : 'Add a new driver to this carrier'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={driverForm.firstName}
                  onChange={(e) => setDriverForm({ ...driverForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={driverForm.lastName}
                  onChange={(e) => setDriverForm({ ...driverForm, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={driverForm.email}
                  onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                />
              </div>
            </div>

            <Separator />
            <h4 className="font-medium">CDL Information</h4>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>CDL Number</Label>
                <Input
                  value={driverForm.cdlNumber}
                  onChange={(e) => setDriverForm({ ...driverForm, cdlNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CDL State</Label>
                <Input
                  maxLength={2}
                  value={driverForm.cdlState}
                  onChange={(e) =>
                    setDriverForm({ ...driverForm, cdlState: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>CDL Class</Label>
                <Select
                  value={driverForm.cdlClass}
                  onValueChange={(value) =>
                    setDriverForm({ ...driverForm, cdlClass: value as CDLClass })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Class A</SelectItem>
                    <SelectItem value="B">Class B</SelectItem>
                    <SelectItem value="C">Class C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CDL Expiry</Label>
                <Input
                  type="date"
                  value={driverForm.cdlExpiry}
                  onChange={(e) => setDriverForm({ ...driverForm, cdlExpiry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Medical Card Expiry</Label>
                <Input
                  type="date"
                  value={driverForm.medicalCardExpiry}
                  onChange={(e) =>
                    setDriverForm({ ...driverForm, medicalCardExpiry: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>CDL Endorsements</Label>
              <Input
                placeholder="H, N, T, P, S..."
                value={driverForm.cdlEndorsements}
                onChange={(e) => setDriverForm({ ...driverForm, cdlEndorsements: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={driverForm.notes}
                onChange={(e) => setDriverForm({ ...driverForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDriverDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveDriver}
              disabled={
                !driverForm.firstName ||
                !driverForm.lastName ||
                createDriver.isPending ||
                updateDriver.isPending
              }
            >
              {createDriver.isPending || updateDriver.isPending ? 'Saving...' : 'Save Driver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Truck Dialog */}
      <Dialog open={showTruckDialog} onOpenChange={setShowTruckDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTruck ? 'Edit Truck' : 'Add Truck'}</DialogTitle>
            <DialogDescription>
              {editingTruck ? 'Update truck information' : 'Add a new truck to this carrier'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unit Number</Label>
                <Input
                  value={truckForm.unitNumber}
                  onChange={(e) => setTruckForm({ ...truckForm, unitNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={truckForm.year}
                  onChange={(e) => setTruckForm({ ...truckForm, year: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={truckForm.category}
                  onValueChange={(value) => setTruckForm({ ...truckForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FLATBED">Flatbed</SelectItem>
                    <SelectItem value="STEP_DECK">Step Deck</SelectItem>
                    <SelectItem value="RGN">RGN</SelectItem>
                    <SelectItem value="LOWBOY">Lowboy</SelectItem>
                    <SelectItem value="DOUBLE_DROP">Double Drop</SelectItem>
                    <SelectItem value="HOTSHOT">Hotshot</SelectItem>
                    <SelectItem value="CONESTOGA">Conestoga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Make</Label>
                <Input
                  value={truckForm.make}
                  onChange={(e) => setTruckForm({ ...truckForm, make: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={truckForm.model}
                  onChange={(e) => setTruckForm({ ...truckForm, model: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>License Plate</Label>
                <Input
                  value={truckForm.licensePlate}
                  onChange={(e) => setTruckForm({ ...truckForm, licensePlate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Plate State</Label>
                <Input
                  maxLength={2}
                  value={truckForm.licensePlateState}
                  onChange={(e) =>
                    setTruckForm({ ...truckForm, licensePlateState: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>VIN</Label>
                <Input
                  value={truckForm.vin}
                  onChange={(e) => setTruckForm({ ...truckForm, vin: e.target.value })}
                />
              </div>
            </div>

            <Separator />
            <h4 className="font-medium">Specifications</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deck Length (ft)</Label>
                <Input
                  type="number"
                  value={truckForm.deckLengthFt}
                  onChange={(e) => setTruckForm({ ...truckForm, deckLengthFt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Cargo Weight (lbs)</Label>
                <Input
                  type="number"
                  value={truckForm.maxCargoWeightLbs}
                  onChange={(e) =>
                    setTruckForm({ ...truckForm, maxCargoWeightLbs: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Equipment</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={truckForm.hasTarps}
                    onChange={(e) => setTruckForm({ ...truckForm, hasTarps: e.target.checked })}
                  />
                  Tarps
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={truckForm.hasChains}
                    onChange={(e) => setTruckForm({ ...truckForm, hasChains: e.target.checked })}
                  />
                  Chains
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={truckForm.hasStraps}
                    onChange={(e) => setTruckForm({ ...truckForm, hasStraps: e.target.checked })}
                  />
                  Straps
                </label>
              </div>
            </div>

            {carrier.drivers.length > 0 && (
              <div className="space-y-2">
                <Label>Assigned Driver</Label>
                <Select
                  value={truckForm.assignedDriverId || ''}
                  onValueChange={(value) =>
                    setTruckForm({ ...truckForm, assignedDriverId: value || null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {carrier.drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.firstName} {driver.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={truckForm.notes}
                onChange={(e) => setTruckForm({ ...truckForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTruckDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTruck}
              disabled={createTruck.isPending || updateTruck.isPending}
            >
              {createTruck.isPending || updateTruck.isPending ? 'Saving...' : 'Save Truck'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Carrier Overview Component (View Mode)
function CarrierOverview({ carrier }: { carrier: any }) {
  const isInsuranceExpiring = () => {
    if (!carrier.insuranceExpiry) return false
    const now = new Date()
    const expiry = new Date(carrier.insuranceExpiry)
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays > 0 && diffDays <= 30
  }

  const isInsuranceExpired = () => {
    if (!carrier.insuranceExpiry) return false
    return new Date(carrier.insuranceExpiry) < new Date()
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Primary Contact</Label>
            <p className="font-medium">{carrier.primaryContactName || '-'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p>{carrier.primaryContactPhone || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p>{carrier.primaryContactEmail || '-'}</p>
            </div>
          </div>
          <Separator />
          <div>
            <Label className="text-muted-foreground">Address</Label>
            <p>
              {carrier.addressLine1 || carrier.city || carrier.state ? (
                <>
                  {carrier.addressLine1 && <span>{carrier.addressLine1}<br /></span>}
                  {carrier.addressLine2 && <span>{carrier.addressLine2}<br /></span>}
                  {(carrier.city || carrier.state || carrier.zip) && (
                    <span>
                      {carrier.city}
                      {carrier.city && carrier.state && ', '}
                      {carrier.state} {carrier.zip}
                    </span>
                  )}
                </>
              ) : (
                '-'
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Payment Terms</Label>
              <p className="font-medium">{carrier.paymentTermsDays} days</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Payment Method</Label>
              <p>
                {carrier.preferredPaymentMethod
                  ? PAYMENT_METHOD_LABELS[carrier.preferredPaymentMethod as PaymentMethod]
                  : '-'}
              </p>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Billing Email</Label>
            <p>{carrier.billingEmail || '-'}</p>
          </div>
          {carrier.preferredPaymentMethod === 'factoring' && (
            <>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Factoring Company</Label>
                <p className="font-medium">{carrier.factoringCompanyName || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Factoring Phone</Label>
                  <p>{carrier.factoringCompanyPhone || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Factoring Email</Label>
                  <p>{carrier.factoringCompanyEmail || '-'}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Insurance Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Insurance
            {(isInsuranceExpired() || isInsuranceExpiring()) && (
              <AlertTriangle
                className={`h-4 w-4 ${isInsuranceExpired() ? 'text-red-500' : 'text-yellow-500'}`}
              />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Insurance Company</Label>
              <p className="font-medium">{carrier.insuranceCompany || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Policy Number</Label>
              <p>{carrier.insurancePolicyNumber || '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Expiry Date</Label>
              <p
                className={`font-medium ${
                  isInsuranceExpired()
                    ? 'text-red-600'
                    : isInsuranceExpiring()
                      ? 'text-yellow-600'
                      : ''
                }`}
              >
                {carrier.insuranceExpiry ? formatDate(carrier.insuranceExpiry) : '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Cargo Limit</Label>
              <p>
                {carrier.cargoInsuranceLimitCents
                  ? formatCurrency(carrier.cargoInsuranceLimitCents)
                  : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company IDs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Company IDs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">MC Number</Label>
              <p className="font-medium">{carrier.mcNumber || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">DOT Number</Label>
              <p className="font-medium">{carrier.dotNumber || '-'}</p>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">EIN / Tax ID</Label>
            <p>{carrier.einTaxId || '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {carrier.notes && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{carrier.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Carrier Edit Form Component
function CarrierEditForm({
  form,
  setForm,
  carrier,
}: {
  form: any
  setForm: (form: any) => void
  carrier: any
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>MC Number</Label>
              <Input
                value={form.mcNumber}
                onChange={(e) => setForm({ ...form, mcNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>DOT Number</Label>
              <Input
                value={form.dotNumber}
                onChange={(e) => setForm({ ...form, dotNumber: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>EIN / Tax ID</Label>
            <Input
              value={form.einTaxId}
              onChange={(e) => setForm({ ...form, einTaxId: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Primary Contact Name</Label>
            <Input
              value={form.primaryContactName}
              onChange={(e) => setForm({ ...form, primaryContactName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.primaryContactPhone}
                onChange={(e) => setForm({ ...form, primaryContactPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.primaryContactEmail}
                onChange={(e) => setForm({ ...form, primaryContactEmail: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Address Line 1</Label>
            <Input
              value={form.addressLine1}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Address Line 2</Label>
            <Input
              value={form.addressLine2}
              onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                maxLength={2}
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Billing Email</Label>
            <Input
              type="email"
              value={form.billingEmail}
              onChange={(e) => setForm({ ...form, billingEmail: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Terms (days)</Label>
              <Input
                type="number"
                value={form.paymentTermsDays}
                onChange={(e) =>
                  setForm({ ...form, paymentTermsDays: parseInt(e.target.value) || 30 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={form.preferredPaymentMethod}
                onValueChange={(value) =>
                  setForm({ ...form, preferredPaymentMethod: value as PaymentMethod })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="ach">ACH</SelectItem>
                  <SelectItem value="quick_pay">Quick Pay</SelectItem>
                  <SelectItem value="factoring">Factoring</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insurance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Insurance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Insurance Company</Label>
              <Input
                value={form.insuranceCompany}
                onChange={(e) => setForm({ ...form, insuranceCompany: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Policy Number</Label>
              <Input
                value={form.insurancePolicyNumber}
                onChange={(e) => setForm({ ...form, insurancePolicyNumber: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={form.insuranceExpiry}
                onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo Limit (cents)</Label>
              <Input
                type="number"
                value={form.cargoInsuranceLimitCents}
                onChange={(e) =>
                  setForm({ ...form, cargoInsuranceLimitCents: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </CardContent>
      </Card>
    </div>
  )
}
