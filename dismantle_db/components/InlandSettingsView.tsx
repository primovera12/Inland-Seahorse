'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, InlandEquipmentType, InlandAccessorialType, InlandLoadType, InlandServiceType, AccessorialBillingUnit, CompanySettings } from '../lib/supabase'
import { validateEmail, validatePhone, validateUrl, validateHexColor, sanitizeText, validateLength } from '../lib/security'

interface InlandSettingsViewProps {
  showToast: (message: string, type: 'success' | 'error') => void
}

type SettingsTab = 'branding' | 'truck_types' | 'load_types' | 'service_types' | 'accessorial_charges'

const BILLING_UNIT_OPTIONS: { value: AccessorialBillingUnit; label: string }[] = [
  { value: 'flat', label: 'Flat Rate' },
  { value: 'hour', label: 'Per Hour' },
  { value: 'day', label: 'Per Day' },
  { value: 'way', label: 'Per Way' },
  { value: 'week', label: 'Per Week' },
  { value: 'month', label: 'Per Month' },
  { value: 'stop', label: 'Per Stop' }
]

export default function InlandSettingsView({ showToast }: InlandSettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('branding')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Branding state
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Truck types state
  const [truckTypes, setTruckTypes] = useState<InlandEquipmentType[]>([])
  const [showTruckModal, setShowTruckModal] = useState(false)
  const [editingTruck, setEditingTruck] = useState<InlandEquipmentType | null>(null)
  const [truckForm, setTruckForm] = useState({
    name: '',
    description: '',
    max_weight_lbs: '',
    max_length_inches: '',
    max_width_inches: '',
    max_height_inches: '',
    rate_multiplier: '1',
    is_active: true,
    sort_order: 0
  })

  // Load types state
  const [loadTypes, setLoadTypes] = useState<InlandLoadType[]>([])
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [editingLoad, setEditingLoad] = useState<InlandLoadType | null>(null)
  const [loadForm, setLoadForm] = useState({
    name: '',
    description: '',
    is_active: true,
    sort_order: 0
  })

  // Accessorial charges state
  const [accessorialTypes, setAccessorialTypes] = useState<InlandAccessorialType[]>([])
  const [showAccessorialModal, setShowAccessorialModal] = useState(false)
  const [editingAccessorial, setEditingAccessorial] = useState<InlandAccessorialType | null>(null)
  const [accessorialForm, setAccessorialForm] = useState({
    name: '',
    description: '',
    default_amount: '',
    is_percentage: false,
    billing_unit: 'flat' as AccessorialBillingUnit,
    condition_text: '',
    free_time_hours: '',
    is_active: true,
    sort_order: 0
  })

  // Service types state
  const [serviceTypes, setServiceTypes] = useState<InlandServiceType[]>([])
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingService, setEditingService] = useState<InlandServiceType | null>(null)
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    default_price: '',
    is_active: true,
    sort_order: 0
  })

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch company settings
        const { data: settingsData } = await supabase
          .from('company_settings')
          .select('*')
          .limit(1)
          .single()

        if (settingsData) {
          setSettings(settingsData)
        }

        // Fetch truck types
        const { data: truckData } = await supabase
          .from('inland_equipment_types')
          .select('*')
          .order('sort_order')
          .order('name')

        if (truckData) setTruckTypes(truckData)

        // Fetch load types
        const { data: loadData } = await supabase
          .from('inland_load_types')
          .select('*')
          .order('sort_order')
          .order('name')

        if (loadData) setLoadTypes(loadData)

        // Fetch accessorial types
        const { data: accessorialData } = await supabase
          .from('inland_accessorial_types')
          .select('*')
          .order('sort_order')
          .order('name')

        if (accessorialData) setAccessorialTypes(accessorialData)

        // Fetch service types
        const { data: serviceData } = await supabase
          .from('inland_service_types')
          .select('*')
          .order('sort_order')
          .order('name')

        if (serviceData) setServiceTypes(serviceData)
      } catch (error) {
        console.error('Error fetching data:', error)
        showToast('Error loading settings', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [showToast])

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a valid image file', 'error')
      return
    }

    if (file.size > 2000000) {
      showToast('Logo must be less than 2MB', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      const img = new window.Image()
      img.onload = () => {
        setSettings(prev => prev ? {
          ...prev,
          logo_base64: base64,
          logo_width: img.width,
          logo_height: img.height
        } : null)
        showToast('Logo uploaded successfully', 'success')
      }
      img.onerror = () => {
        setSettings(prev => prev ? {
          ...prev,
          logo_base64: base64,
          logo_width: 200,
          logo_height: 100
        } : null)
        showToast('Logo uploaded', 'success')
      }
      img.src = base64
    }
    reader.readAsDataURL(file)
  }

  // Save company settings
  const saveSettings = async () => {
    if (!settings) return

    const validationErrors: string[] = []
    const nameValidation = validateLength(settings.company_name, { min: 1, max: 200 })
    if (!nameValidation.valid) validationErrors.push('Company name is required')

    if (settings.company_email) {
      const emailValidation = validateEmail(settings.company_email)
      if (!emailValidation.valid) validationErrors.push('Invalid email format')
    }

    if (settings.company_phone) {
      const phoneValidation = validatePhone(settings.company_phone)
      if (!phoneValidation.valid) validationErrors.push('Invalid phone format')
    }

    if (settings.company_website) {
      const urlValidation = validateUrl(settings.company_website)
      if (!urlValidation.valid) validationErrors.push('Invalid website URL')
    }

    const primaryColorValidation = validateHexColor(settings.primary_color)
    if (!primaryColorValidation.valid) validationErrors.push('Invalid primary color')

    if (validationErrors.length > 0) {
      showToast(validationErrors[0], 'error')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('company_settings')
        .update({
          company_name: sanitizeText(settings.company_name),
          company_address: sanitizeText(settings.company_address),
          company_phone: settings.company_phone,
          company_email: settings.company_email,
          company_website: settings.company_website,
          logo_base64: settings.logo_base64,
          logo_width: settings.logo_width,
          logo_height: settings.logo_height,
          logo_width_percent: settings.logo_width_percent || 50,
          primary_color: primaryColorValidation.sanitized,
          secondary_color: settings.secondary_color,
          accent_color: settings.accent_color,
          quote_validity_days: settings.quote_validity_days,
          footer_text: sanitizeText(settings.footer_text),
          terms_and_conditions: sanitizeText(settings.terms_and_conditions),
          dimension_threshold_length: settings.dimension_threshold_length ?? 70,
          dimension_threshold_width: settings.dimension_threshold_width ?? 16,
          dimension_threshold_height: settings.dimension_threshold_height ?? 18,
        })
        .eq('id', settings.id)

      if (error) throw error
      showToast('Settings saved successfully', 'success')
    } catch (error) {
      console.error('Error saving settings:', error)
      showToast('Error saving settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Truck type CRUD
  const openNewTruck = () => {
    setEditingTruck(null)
    setTruckForm({
      name: '',
      description: '',
      max_weight_lbs: '',
      max_length_inches: '',
      max_width_inches: '',
      max_height_inches: '',
      rate_multiplier: '1',
      is_active: true,
      sort_order: truckTypes.length
    })
    setShowTruckModal(true)
  }

  const openEditTruck = (truck: InlandEquipmentType) => {
    setEditingTruck(truck)
    setTruckForm({
      name: truck.name,
      description: truck.description || '',
      max_weight_lbs: truck.max_weight_lbs?.toString() || '',
      max_length_inches: truck.max_length_inches?.toString() || '',
      max_width_inches: truck.max_width_inches?.toString() || '',
      max_height_inches: truck.max_height_inches?.toString() || '',
      rate_multiplier: truck.rate_multiplier?.toString() || '1',
      is_active: truck.is_active,
      sort_order: truck.sort_order
    })
    setShowTruckModal(true)
  }

  const saveTruck = async () => {
    if (!truckForm.name.trim()) {
      showToast('Truck type name is required', 'error')
      return
    }

    setSaving(true)
    try {
      const truckData = {
        name: truckForm.name.trim(),
        description: truckForm.description.trim() || null,
        max_weight_lbs: truckForm.max_weight_lbs ? parseInt(truckForm.max_weight_lbs) : null,
        max_length_inches: truckForm.max_length_inches ? parseInt(truckForm.max_length_inches) : null,
        max_width_inches: truckForm.max_width_inches ? parseInt(truckForm.max_width_inches) : null,
        max_height_inches: truckForm.max_height_inches ? parseInt(truckForm.max_height_inches) : null,
        rate_multiplier: parseFloat(truckForm.rate_multiplier) || 1,
        is_active: truckForm.is_active,
        sort_order: truckForm.sort_order
      }

      if (editingTruck) {
        const { error } = await supabase
          .from('inland_equipment_types')
          .update(truckData)
          .eq('id', editingTruck.id)

        if (error) throw error
        setTruckTypes(prev => prev.map(t => t.id === editingTruck.id ? { ...t, ...truckData } : t))
        showToast('Truck type updated', 'success')
      } else {
        const { data, error } = await supabase
          .from('inland_equipment_types')
          .insert(truckData)
          .select()
          .single()

        if (error) throw error
        if (data) setTruckTypes(prev => [...prev, data])
        showToast('Truck type created', 'success')
      }

      setShowTruckModal(false)
    } catch (error) {
      console.error('Error saving truck type:', error)
      showToast('Error saving truck type', 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteTruck = async (id: string) => {
    if (!confirm('Delete this truck type?')) return

    try {
      const { error } = await supabase
        .from('inland_equipment_types')
        .delete()
        .eq('id', id)

      if (error) throw error
      setTruckTypes(prev => prev.filter(t => t.id !== id))
      showToast('Truck type deleted', 'success')
    } catch (error) {
      console.error('Error deleting truck type:', error)
      showToast('Error deleting truck type', 'error')
    }
  }

  // Load type CRUD
  const openNewLoad = () => {
    setEditingLoad(null)
    setLoadForm({
      name: '',
      description: '',
      is_active: true,
      sort_order: loadTypes.length
    })
    setShowLoadModal(true)
  }

  const openEditLoad = (load: InlandLoadType) => {
    setEditingLoad(load)
    setLoadForm({
      name: load.name,
      description: load.description || '',
      is_active: load.is_active,
      sort_order: load.sort_order
    })
    setShowLoadModal(true)
  }

  const saveLoad = async () => {
    if (!loadForm.name.trim()) {
      showToast('Load type name is required', 'error')
      return
    }

    setSaving(true)
    try {
      const loadData = {
        name: loadForm.name.trim(),
        description: loadForm.description.trim() || null,
        is_active: loadForm.is_active,
        sort_order: loadForm.sort_order
      }

      if (editingLoad) {
        const { error } = await supabase
          .from('inland_load_types')
          .update(loadData)
          .eq('id', editingLoad.id)

        if (error) throw error
        setLoadTypes(prev => prev.map(l => l.id === editingLoad.id ? { ...l, ...loadData } : l))
        showToast('Load type updated', 'success')
      } else {
        const { data, error } = await supabase
          .from('inland_load_types')
          .insert(loadData)
          .select()
          .single()

        if (error) throw error
        if (data) setLoadTypes(prev => [...prev, data])
        showToast('Load type created', 'success')
      }

      setShowLoadModal(false)
    } catch (error) {
      console.error('Error saving load type:', error)
      showToast('Error saving load type', 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteLoad = async (id: string) => {
    if (!confirm('Delete this load type?')) return

    try {
      const { error } = await supabase
        .from('inland_load_types')
        .delete()
        .eq('id', id)

      if (error) throw error
      setLoadTypes(prev => prev.filter(l => l.id !== id))
      showToast('Load type deleted', 'success')
    } catch (error) {
      console.error('Error deleting load type:', error)
      showToast('Error deleting load type', 'error')
    }
  }

  // Accessorial charge CRUD
  const openNewAccessorial = () => {
    setEditingAccessorial(null)
    setAccessorialForm({
      name: '',
      description: '',
      default_amount: '',
      is_percentage: false,
      billing_unit: 'flat',
      condition_text: '',
      free_time_hours: '',
      is_active: true,
      sort_order: accessorialTypes.length
    })
    setShowAccessorialModal(true)
  }

  const openEditAccessorial = (acc: InlandAccessorialType) => {
    setEditingAccessorial(acc)
    setAccessorialForm({
      name: acc.name,
      description: acc.description || '',
      default_amount: acc.default_amount?.toString() || '',
      is_percentage: acc.is_percentage,
      billing_unit: acc.billing_unit,
      condition_text: acc.condition_text || '',
      free_time_hours: acc.free_time_hours?.toString() || '',
      is_active: acc.is_active,
      sort_order: acc.sort_order
    })
    setShowAccessorialModal(true)
  }

  const saveAccessorial = async () => {
    if (!accessorialForm.name.trim()) {
      showToast('Accessorial charge name is required', 'error')
      return
    }

    setSaving(true)
    try {
      const accessorialData = {
        name: accessorialForm.name.trim(),
        description: accessorialForm.description.trim() || null,
        default_amount: accessorialForm.default_amount ? parseFloat(accessorialForm.default_amount) : 0,
        is_percentage: accessorialForm.is_percentage,
        billing_unit: accessorialForm.billing_unit,
        condition_text: accessorialForm.condition_text.trim() || null,
        free_time_hours: accessorialForm.free_time_hours ? parseInt(accessorialForm.free_time_hours) : null,
        is_active: accessorialForm.is_active,
        sort_order: accessorialForm.sort_order
      }

      if (editingAccessorial) {
        const { error } = await supabase
          .from('inland_accessorial_types')
          .update(accessorialData)
          .eq('id', editingAccessorial.id)

        if (error) throw error
        setAccessorialTypes(prev => prev.map(a => a.id === editingAccessorial.id ? { ...a, ...accessorialData } : a))
        showToast('Accessorial charge updated', 'success')
      } else {
        const { data, error } = await supabase
          .from('inland_accessorial_types')
          .insert(accessorialData)
          .select()
          .single()

        if (error) throw error
        if (data) setAccessorialTypes(prev => [...prev, data])
        showToast('Accessorial charge created', 'success')
      }

      setShowAccessorialModal(false)
    } catch (error) {
      console.error('Error saving accessorial charge:', error)
      showToast('Error saving accessorial charge', 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteAccessorial = async (id: string) => {
    if (!confirm('Delete this accessorial charge?')) return

    try {
      const { error } = await supabase
        .from('inland_accessorial_types')
        .delete()
        .eq('id', id)

      if (error) throw error
      setAccessorialTypes(prev => prev.filter(a => a.id !== id))
      showToast('Accessorial charge deleted', 'success')
    } catch (error) {
      console.error('Error deleting accessorial charge:', error)
      showToast('Error deleting accessorial charge', 'error')
    }
  }

  // Service type CRUD
  const openNewService = () => {
    setEditingService(null)
    setServiceForm({
      name: '',
      description: '',
      default_price: '',
      is_active: true,
      sort_order: serviceTypes.length
    })
    setShowServiceModal(true)
  }

  const openEditService = (service: InlandServiceType) => {
    setEditingService(service)
    setServiceForm({
      name: service.name,
      description: service.description || '',
      default_price: service.default_price?.toString() || '',
      is_active: service.is_active,
      sort_order: service.sort_order
    })
    setShowServiceModal(true)
  }

  const saveService = async () => {
    if (!serviceForm.name.trim()) {
      showToast('Service type name is required', 'error')
      return
    }

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const serviceData = {
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim() || null,
        default_price: serviceForm.default_price ? parseFloat(serviceForm.default_price) : 0,
        is_active: serviceForm.is_active,
        sort_order: serviceForm.sort_order,
        updated_at: now
      }

      if (editingService) {
        const { error } = await supabase
          .from('inland_service_types')
          .update(serviceData)
          .eq('id', editingService.id)

        if (error) throw error
        setServiceTypes(prev => prev.map(s => s.id === editingService.id ? { ...s, ...serviceData } : s))
        showToast('Service type updated', 'success')
      } else {
        const { data, error } = await supabase
          .from('inland_service_types')
          .insert({ ...serviceData, created_at: now })
          .select()
          .single()

        if (error) {
          console.error('Insert error details:', error)
          throw error
        }
        if (data) setServiceTypes(prev => [...prev, data])
        showToast('Service type created', 'success')
      }

      setShowServiceModal(false)
    } catch (error: unknown) {
      console.error('Error saving service type:', error)
      const errMsg = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : 'Unknown error')
      showToast(`Error saving service type: ${errMsg}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteService = async (id: string) => {
    if (!confirm('Delete this service type?')) return

    try {
      const { error } = await supabase
        .from('inland_service_types')
        .delete()
        .eq('id', id)

      if (error) throw error
      setServiceTypes(prev => prev.filter(s => s.id !== id))
      showToast('Service type deleted', 'success')
    } catch (error) {
      console.error('Error deleting service type:', error)
      showToast('Error deleting service type', 'error')
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading settings...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inland Quote Settings</h2>
          <p className="text-sm text-gray-500">Configure settings for inland transportation quotes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex border-b overflow-x-auto">
          {[
            { id: 'branding', label: 'Branding & Info', icon: '🎨' },
            { id: 'truck_types', label: 'Truck Types', icon: '🚛' },
            { id: 'load_types', label: 'Load Types', icon: '📦' },
            { id: 'service_types', label: 'Service Types', icon: '🚚' },
            { id: 'accessorial_charges', label: 'Accessorial Charges', icon: '💰' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Branding Tab */}
          {activeTab === 'branding' && settings && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={settings.company_name || ''}
                      onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={settings.company_email || ''}
                      onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={settings.company_phone || ''}
                      onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={settings.company_website || ''}
                      onChange={(e) => setSettings({ ...settings, company_website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={settings.company_address || ''}
                      onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Logo</h3>
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    {settings.logo_base64 ? (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <img
                          src={settings.logo_base64}
                          alt="Company Logo"
                          className="max-h-24 object-contain mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="w-full sm:w-32 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        No logo
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 flex-1 w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                      >
                        Upload Logo
                      </button>
                      {settings.logo_base64 && (
                        <button
                          onClick={() => setSettings({ ...settings, logo_base64: null })}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">Max 2MB. PNG or JPG recommended.</p>

                    {settings.logo_base64 && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <h4 className="text-sm font-medium text-gray-700">Logo Size in PDF</h4>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm text-gray-600">Width (% of info box)</label>
                            <span className="text-sm font-medium text-gray-900">{settings.logo_width_percent || 50}%</span>
                          </div>
                          <input
                            type="range"
                            value={settings.logo_width_percent || 50}
                            onChange={(e) => setSettings({ ...settings, logo_width_percent: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-purple-600"
                            min="20"
                            max="100"
                            step="5"
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>20%</span>
                            <span>50%</span>
                            <span>100%</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <button
                            onClick={() => setSettings({ ...settings, logo_width_percent: 30 })}
                            className={`px-3 py-1.5 text-xs rounded ${settings.logo_width_percent === 30 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Small (30%)
                          </button>
                          <button
                            onClick={() => setSettings({ ...settings, logo_width_percent: 50 })}
                            className={`px-3 py-1.5 text-xs rounded ${(settings.logo_width_percent || 50) === 50 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Medium (50%)
                          </button>
                          <button
                            onClick={() => setSettings({ ...settings, logo_width_percent: 70 })}
                            className={`px-3 py-1.5 text-xs rounded ${settings.logo_width_percent === 70 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Large (70%)
                          </button>
                          <button
                            onClick={() => setSettings({ ...settings, logo_width_percent: 90 })}
                            className={`px-3 py-1.5 text-xs rounded ${settings.logo_width_percent === 90 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            X-Large (90%)
                          </button>
                        </div>

                        {/* PDF Preview */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">PDF Preview</h4>
                          <div className="border border-gray-300 rounded-lg bg-white p-3 shadow-sm">
                            {/* Simulated PDF top section */}
                            <div className="flex gap-2" style={{ fontSize: '10px' }}>
                              {/* Left box - Company Info */}
                              <div className="flex-1 bg-gray-50 rounded p-2 min-h-[80px]">
                                <div style={{ width: `${settings.logo_width_percent || 50}%`, maxWidth: '100%' }}>
                                  <img
                                    src={settings.logo_base64}
                                    alt="Logo"
                                    className="object-contain"
                                    style={{ maxHeight: '35px', width: '100%' }}
                                  />
                                </div>
                                <div className="mt-2 space-y-0.5 text-gray-600" style={{ fontSize: '8px' }}>
                                  {settings.company_email && (
                                    <div><span className="text-gray-400">Email:</span> <span className="font-medium text-gray-800">{settings.company_email}</span></div>
                                  )}
                                  {settings.company_website && (
                                    <div><span className="text-gray-400">Website:</span> <span className="font-medium text-gray-800">{settings.company_website}</span></div>
                                  )}
                                </div>
                              </div>
                              {/* Right box - Quote Details */}
                              <div className="flex-1 bg-gray-50 rounded p-2 min-h-[80px]">
                                <div className="space-y-0.5" style={{ fontSize: '8px' }}>
                                  <div><span className="text-gray-400">Quote #:</span> <span className="font-medium text-gray-800">INL-2025-0001</span></div>
                                  <div><span className="text-gray-400">Date:</span> <span className="font-medium text-gray-800">December 17, 2025</span></div>
                                  <div><span className="text-gray-400">Distance:</span> <span className="font-medium text-gray-800">450 miles</span></div>
                                  <div><span className="text-gray-400">Equipment:</span> <span className="font-medium text-gray-800">Flatbed</span></div>
                                </div>
                              </div>
                            </div>
                            <p className="text-center text-gray-400 mt-2" style={{ fontSize: '7px' }}>Preview of PDF header layout</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Theme Color */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme Color</h3>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={settings.primary_color || '#581c87'}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primary_color || '#581c87'}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                    placeholder="#581c87"
                  />
                </div>
              </div>

              {/* Quote Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-700">Quote validity (days):</label>
                    <input
                      type="number"
                      value={settings.quote_validity_days || 7}
                      onChange={(e) => setSettings({ ...settings, quote_validity_days: parseInt(e.target.value) || 7 })}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                      max="365"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
                    <input
                      type="text"
                      value={settings.footer_text || ''}
                      onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Thank you for your business!"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                    <textarea
                      value={settings.terms_and_conditions || ''}
                      onChange={(e) => setSettings({ ...settings, terms_and_conditions: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                      placeholder="Terms and conditions for inland transportation quotes..."
                    />
                  </div>
                </div>
              </div>

              {/* Dimension Auto-Conversion Thresholds */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dimension Auto-Conversion</h3>
                <p className="text-sm text-gray-500 mb-4">
                  When entering cargo dimensions, values <strong>above</strong> these thresholds are treated as inches and auto-converted to ft.in format.
                  Values below are treated as feet.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Length Threshold</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.dimension_threshold_length ?? 70}
                        onChange={(e) => setSettings({ ...settings, dimension_threshold_length: parseInt(e.target.value) || 70 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                        max="999"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">Default: 70</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">e.g., 159 → 13ft 3in</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width Threshold</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.dimension_threshold_width ?? 16}
                        onChange={(e) => setSettings({ ...settings, dimension_threshold_width: parseInt(e.target.value) || 16 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                        max="999"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">Default: 16</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">e.g., 102 → 8ft 6in</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height Threshold</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.dimension_threshold_height ?? 18}
                        onChange={(e) => setSettings({ ...settings, dimension_threshold_height: parseInt(e.target.value) || 18 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                        max="999"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">Default: 18</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">e.g., 120 → 10ft 0in</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Truck Types Tab */}
          {activeTab === 'truck_types' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Configure the truck/equipment types available for inland transportation quotes.
                </p>
                <button
                  onClick={openNewTruck}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
                >
                  <span>+</span> Add Truck Type
                </button>
              </div>

              <div className="border rounded-lg divide-y">
                {truckTypes.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No truck types configured. Add your first truck type above.
                  </div>
                ) : (
                  truckTypes.map(truck => (
                    <div key={truck.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🚛</span>
                            <div>
                              <span className="font-medium text-gray-900">{truck.name}</span>
                              {!truck.is_active && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1 ml-10">
                            {truck.description || 'No description'}
                            {truck.max_weight_lbs && ` • Max ${truck.max_weight_lbs.toLocaleString()} lbs`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditTruck(truck)}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTruck(truck.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Load Types Tab */}
          {activeTab === 'load_types' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Configure load types to categorize different kinds of cargo/loads.
                </p>
                <button
                  onClick={openNewLoad}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
                >
                  <span>+</span> Add Load Type
                </button>
              </div>

              <div className="border rounded-lg divide-y">
                {loadTypes.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No load types configured. Add your first load type above.
                  </div>
                ) : (
                  loadTypes.map(load => (
                    <div key={load.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">📦</span>
                            <div>
                              <span className="font-medium text-gray-900">{load.name}</span>
                              {!load.is_active && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1 ml-10">
                            {load.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditLoad(load)}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteLoad(load.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Service Types Tab */}
          {activeTab === 'service_types' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Configure service types for the rates dropdown (e.g., Line Haul, Drayage, Loading).
                </p>
                <button
                  onClick={openNewService}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
                >
                  <span>+</span> Add Service Type
                </button>
              </div>

              <div className="border rounded-lg divide-y">
                {serviceTypes.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No service types configured. Add your first service type above.
                  </div>
                ) : (
                  serviceTypes.map(service => (
                    <div key={service.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🚚</span>
                            <div>
                              <span className="font-medium text-gray-900">{service.name}</span>
                              {!service.is_active && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                  Inactive
                                </span>
                              )}
                              {service.default_price && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                  ${service.default_price}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1 ml-10">
                            {service.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditService(service)}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteService(service.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Accessorial Charges Tab */}
          {activeTab === 'accessorial_charges' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Configure accessorial charges that can be added to inland transportation quotes.
                </p>
                <button
                  onClick={openNewAccessorial}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
                >
                  <span>+</span> Add Accessorial Charge
                </button>
              </div>

              <div className="border rounded-lg divide-y">
                {accessorialTypes.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No accessorial charges configured. Add your first charge type above.
                  </div>
                ) : (
                  accessorialTypes.map(acc => (
                    <div key={acc.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">💰</span>
                            <div>
                              <span className="font-medium text-gray-900">{acc.name}</span>
                              {!acc.is_active && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                  Inactive
                                </span>
                              )}
                              <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                {acc.is_percentage ? `${acc.default_amount}%` : `$${acc.default_amount}`}
                                {acc.billing_unit !== 'flat' && ` / ${acc.billing_unit}`}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1 ml-10">
                            {acc.description || acc.condition_text || 'No description'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditAccessorial(acc)}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteAccessorial(acc.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Truck Type Modal */}
      {showTruckModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b">
              <h3 className="text-lg font-semibold">{editingTruck ? 'Edit Truck Type' : 'New Truck Type'}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={truckForm.name}
                  onChange={(e) => setTruckForm({ ...truckForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Flatbed, Step Deck, RGN"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={truckForm.description}
                  onChange={(e) => setTruckForm({ ...truckForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                  placeholder="Brief description of this truck type..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Weight (lbs)</label>
                  <input
                    type="number"
                    value={truckForm.max_weight_lbs}
                    onChange={(e) => setTruckForm({ ...truckForm, max_weight_lbs: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="48000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={truckForm.rate_multiplier}
                    onChange={(e) => setTruckForm({ ...truckForm, rate_multiplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="1.0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Length (in)</label>
                  <input
                    type="number"
                    value={truckForm.max_length_inches}
                    onChange={(e) => setTruckForm({ ...truckForm, max_length_inches: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="636"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Width (in)</label>
                  <input
                    type="number"
                    value={truckForm.max_width_inches}
                    onChange={(e) => setTruckForm({ ...truckForm, max_width_inches: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="102"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Height (in)</label>
                  <input
                    type="number"
                    value={truckForm.max_height_inches}
                    onChange={(e) => setTruckForm({ ...truckForm, max_height_inches: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="102"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="truck_is_active"
                  checked={truckForm.is_active}
                  onChange={(e) => setTruckForm({ ...truckForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="truck_is_active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowTruckModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveTruck}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Type Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">{editingLoad ? 'Edit Load Type' : 'New Load Type'}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={loadForm.name}
                  onChange={(e) => setLoadForm({ ...loadForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Equipment, Machinery, Vehicles"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={loadForm.description}
                  onChange={(e) => setLoadForm({ ...loadForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                  placeholder="Brief description..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="load_is_active"
                  checked={loadForm.is_active}
                  onChange={(e) => setLoadForm({ ...loadForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="load_is_active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowLoadModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveLoad}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Type Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">{editingService ? 'Edit Service Type' : 'New Service Type'}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Line Haul, Drayage, Loading"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                  placeholder="Brief description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={serviceForm.default_price}
                  onChange={(e) => setServiceForm({ ...serviceForm, default_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Optional default price"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="service_is_active"
                  checked={serviceForm.is_active}
                  onChange={(e) => setServiceForm({ ...serviceForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="service_is_active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowServiceModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveService}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessorial Charge Modal */}
      {showAccessorialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b">
              <h3 className="text-lg font-semibold">{editingAccessorial ? 'Edit Accessorial Charge' : 'New Accessorial Charge'}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={accessorialForm.name}
                  onChange={(e) => setAccessorialForm({ ...accessorialForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Detention, TONU, Layover"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={accessorialForm.description}
                  onChange={(e) => setAccessorialForm({ ...accessorialForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                  placeholder="Brief description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={accessorialForm.default_amount}
                    onChange={(e) => setAccessorialForm({ ...accessorialForm, default_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="75"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Unit</label>
                  <select
                    value={accessorialForm.billing_unit}
                    onChange={(e) => setAccessorialForm({ ...accessorialForm, billing_unit: e.target.value as AccessorialBillingUnit })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {BILLING_UNIT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={accessorialForm.is_percentage}
                    onChange={(e) => setAccessorialForm({ ...accessorialForm, is_percentage: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">Amount is a percentage</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition Text (shown on quote)</label>
                <input
                  type="text"
                  value={accessorialForm.condition_text}
                  onChange={(e) => setAccessorialForm({ ...accessorialForm, condition_text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., After 2 hours free time"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Free Time Hours</label>
                <input
                  type="number"
                  value={accessorialForm.free_time_hours}
                  onChange={(e) => setAccessorialForm({ ...accessorialForm, free_time_hours: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="2"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="acc_is_active"
                  checked={accessorialForm.is_active}
                  onChange={(e) => setAccessorialForm({ ...accessorialForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="acc_is_active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowAccessorialModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveAccessorial}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
