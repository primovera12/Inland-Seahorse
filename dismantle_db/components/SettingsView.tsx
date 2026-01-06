'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, CompanySettings, QuoteTemplate, LOCATIONS, ALL_COST_FIELDS, Location } from '../lib/supabase'
import { validateEmail, validatePhone, validateUrl, validateHexColor, sanitizeText, validateLength } from '../lib/security'

interface SettingsViewProps {
  showToast: (message: string, type: 'success' | 'error') => void
}

type SettingsTab = 'branding' | 'templates'

export default function SettingsView({ showToast }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('branding')
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Template editing state
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    location: '' as Location | '',
    dismantling_loading_cost: '',
    loading_cost: '',
    blocking_bracing_cost: '',
    ncb_survey_cost: '',
    local_drayage_cost: '',
    chassis_cost: '',
    tolls_cost: '',
    escorts_cost: '',
    power_wash_cost: '',
    waste_fluids_disposal_fee: '',
    miscellaneous_costs: '',
    default_margin_percentage: '0'
  })

  // Fetch settings and templates
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

        // Fetch templates
        const { data: templatesData } = await supabase
          .from('quote_templates')
          .select('*')
          .order('location')
          .order('name')

        if (templatesData) {
          setTemplates(templatesData)
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handle logo upload - supports any image format
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type - accept common image formats
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|gif|webp|svg|bmp)$/i)) {
      showToast('Please upload a valid image file (PNG, JPEG, GIF, WebP, SVG, or BMP)', 'error')
      return
    }

    if (file.size > 2000000) { // Increased limit to 2MB
      showToast('Logo must be less than 2MB', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string

      // Create an image element to get dimensions
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
        // Even if we can't get dimensions, still set the base64
        setSettings(prev => prev ? {
          ...prev,
          logo_base64: base64,
          logo_width: 200, // Default fallback
          logo_height: 100 // Default fallback
        } : null)
        showToast('Logo uploaded (dimensions defaulted)', 'success')
      }
      img.src = base64
    }
    reader.onerror = () => {
      showToast('Failed to read the image file', 'error')
    }
    reader.readAsDataURL(file)
  }

  // Save company settings with input validation
  const saveSettings = async () => {
    if (!settings) return

    // Validate inputs before saving
    const validationErrors: string[] = []

    // Validate company name (required, max 200 chars)
    const nameValidation = validateLength(settings.company_name, { min: 1, max: 200 })
    if (!nameValidation.valid) {
      validationErrors.push('Company name is required and must be under 200 characters')
    }

    // Validate email if provided
    if (settings.company_email) {
      const emailValidation = validateEmail(settings.company_email)
      if (!emailValidation.valid) {
        validationErrors.push('Invalid email address format')
      }
    }

    // Validate phone if provided
    if (settings.company_phone) {
      const phoneValidation = validatePhone(settings.company_phone)
      if (!phoneValidation.valid) {
        validationErrors.push('Invalid phone number format')
      }
    }

    // Validate website URL if provided
    if (settings.company_website) {
      const urlValidation = validateUrl(settings.company_website)
      if (!urlValidation.valid) {
        validationErrors.push('Invalid website URL format')
      }
    }

    // Validate colors
    const primaryColorValidation = validateHexColor(settings.primary_color)
    const secondaryColorValidation = validateHexColor(settings.secondary_color)
    const accentColorValidation = validateHexColor(settings.accent_color)

    if (!primaryColorValidation.valid || !secondaryColorValidation.valid || !accentColorValidation.valid) {
      validationErrors.push('Invalid color format. Use hex colors like #1A56DB')
    }

    // Check for validation errors
    if (validationErrors.length > 0) {
      showToast(validationErrors[0], 'error')
      return
    }

    setSaving(true)
    try {
      // Sanitize text inputs before saving
      const { error } = await supabase
        .from('company_settings')
        .update({
          company_name: sanitizeText(settings.company_name),
          company_address: sanitizeText(settings.company_address),
          company_phone: settings.company_phone ? validatePhone(settings.company_phone).sanitized : null,
          company_email: settings.company_email ? validateEmail(settings.company_email).sanitized : null,
          company_website: settings.company_website ? validateUrl(settings.company_website).sanitized : null,
          logo_base64: settings.logo_base64,
          logo_width: settings.logo_width,
          logo_height: settings.logo_height,
          logo_width_percent: settings.logo_width_percent || 50,
          primary_color: primaryColorValidation.sanitized,
          secondary_color: secondaryColorValidation.sanitized,
          accent_color: accentColorValidation.sanitized,
          show_company_address: settings.show_company_address,
          show_company_phone: settings.show_company_phone,
          show_company_email: settings.show_company_email,
          quote_validity_days: Math.min(Math.max(1, settings.quote_validity_days), 365), // Clamp between 1-365
          footer_text: sanitizeText(settings.footer_text),
          terms_and_conditions: sanitizeText(settings.terms_and_conditions)
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

  // Template CRUD operations
  const openNewTemplate = () => {
    setEditingTemplate(null)
    setTemplateForm({
      name: '',
      location: '',
      dismantling_loading_cost: '',
      loading_cost: '',
      blocking_bracing_cost: '',
      ncb_survey_cost: '',
      local_drayage_cost: '',
      chassis_cost: '',
      tolls_cost: '',
      escorts_cost: '',
      power_wash_cost: '',
      waste_fluids_disposal_fee: '',
      miscellaneous_costs: '',
      default_margin_percentage: '0'
    })
    setShowTemplateModal(true)
  }

  const openEditTemplate = (template: QuoteTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      location: template.location,
      dismantling_loading_cost: template.dismantling_loading_cost?.toString() || '',
      loading_cost: template.loading_cost?.toString() || '',
      blocking_bracing_cost: template.blocking_bracing_cost?.toString() || '',
      ncb_survey_cost: template.ncb_survey_cost?.toString() || '',
      local_drayage_cost: template.local_drayage_cost?.toString() || '',
      chassis_cost: template.chassis_cost?.toString() || '',
      tolls_cost: template.tolls_cost?.toString() || '',
      escorts_cost: template.escorts_cost?.toString() || '',
      power_wash_cost: template.power_wash_cost?.toString() || '',
      waste_fluids_disposal_fee: template.waste_fluids_disposal_fee?.toString() || '',
      miscellaneous_costs: template.miscellaneous_costs?.toString() || '',
      default_margin_percentage: template.default_margin_percentage?.toString() || '0'
    })
    setShowTemplateModal(true)
  }

  const saveTemplate = async () => {
    if (!templateForm.name || !templateForm.location) {
      showToast('Name and location are required', 'error')
      return
    }

    setSaving(true)
    try {
      const templateData = {
        name: templateForm.name,
        location: templateForm.location,
        dismantling_loading_cost: templateForm.dismantling_loading_cost ? parseFloat(templateForm.dismantling_loading_cost) : null,
        loading_cost: templateForm.loading_cost ? parseFloat(templateForm.loading_cost) : null,
        blocking_bracing_cost: templateForm.blocking_bracing_cost ? parseFloat(templateForm.blocking_bracing_cost) : null,
        ncb_survey_cost: templateForm.ncb_survey_cost ? parseFloat(templateForm.ncb_survey_cost) : null,
        local_drayage_cost: templateForm.local_drayage_cost ? parseFloat(templateForm.local_drayage_cost) : null,
        chassis_cost: templateForm.chassis_cost ? parseFloat(templateForm.chassis_cost) : null,
        tolls_cost: templateForm.tolls_cost ? parseFloat(templateForm.tolls_cost) : null,
        escorts_cost: templateForm.escorts_cost ? parseFloat(templateForm.escorts_cost) : null,
        power_wash_cost: templateForm.power_wash_cost ? parseFloat(templateForm.power_wash_cost) : null,
        waste_fluids_disposal_fee: templateForm.waste_fluids_disposal_fee ? parseFloat(templateForm.waste_fluids_disposal_fee) : null,
        miscellaneous_costs: templateForm.miscellaneous_costs ? parseFloat(templateForm.miscellaneous_costs) : null,
        default_margin_percentage: parseFloat(templateForm.default_margin_percentage) || 0
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from('quote_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)

        if (error) throw error
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...templateData } : t))
        showToast('Template updated', 'success')
      } else {
        const { data, error } = await supabase
          .from('quote_templates')
          .insert(templateData)
          .select()
          .single()

        if (error) throw error
        if (data) {
          setTemplates(prev => [...prev, data])
        }
        showToast('Template created', 'success')
      }

      setShowTemplateModal(false)
    } catch (error) {
      console.error('Error saving template:', error)
      showToast('Error saving template', 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return

    try {
      const { error } = await supabase
        .from('quote_templates')
        .delete()
        .eq('id', id)

      if (error) throw error
      setTemplates(prev => prev.filter(t => t.id !== id))
      showToast('Template deleted', 'success')
    } catch (error) {
      console.error('Error deleting template:', error)
      showToast('Error deleting template', 'error')
    }
  }

  const setDefaultTemplate = async (template: QuoteTemplate) => {
    try {
      // First, unset any existing default for this location
      await supabase
        .from('quote_templates')
        .update({ is_default: false })
        .eq('location', template.location)

      // Set this one as default
      const { error } = await supabase
        .from('quote_templates')
        .update({ is_default: true })
        .eq('id', template.id)

      if (error) throw error

      setTemplates(prev => prev.map(t => ({
        ...t,
        is_default: t.id === template.id ? true : (t.location === template.location ? false : t.is_default)
      })))
      showToast(`Set as default for ${template.location}`, 'success')
    } catch (error) {
      console.error('Error setting default:', error)
      showToast('Error setting default template', 'error')
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading settings...</div>
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('branding')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'branding'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Company Branding
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Quote Templates
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'branding' && settings && (
            <div className="space-y-6">
              {/* Company Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={settings.company_name || ''}
                      onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={settings.company_email || ''}
                      onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={settings.company_phone || ''}
                      onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={settings.company_website || ''}
                      onChange={(e) => setSettings({ ...settings, company_website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={settings.company_address || ''}
                      onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          style={{ maxWidth: settings.logo_width, width: '100%' }}
                          className="object-contain mx-auto"
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
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
                      >
                        Upload Logo
                      </button>
                      {settings.logo_base64 && (
                        <button
                          onClick={() => setSettings({ ...settings, logo_base64: null })}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm sm:text-base"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">Max 500KB. PNG or JPG recommended.</p>

                    {/* Logo Size Control */}
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
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
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
                            className={`px-3 py-1.5 text-xs rounded ${settings.logo_width_percent === 30 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Small (30%)
                          </button>
                          <button
                            onClick={() => setSettings({ ...settings, logo_width_percent: 50 })}
                            className={`px-3 py-1.5 text-xs rounded ${(settings.logo_width_percent || 50) === 50 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Medium (50%)
                          </button>
                          <button
                            onClick={() => setSettings({ ...settings, logo_width_percent: 70 })}
                            className={`px-3 py-1.5 text-xs rounded ${settings.logo_width_percent === 70 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Large (70%)
                          </button>
                          <button
                            onClick={() => setSettings({ ...settings, logo_width_percent: 90 })}
                            className={`px-3 py-1.5 text-xs rounded ${settings.logo_width_percent === 90 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
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
                                  {settings.company_address && (
                                    <div><span className="text-gray-400">Address:</span> <span className="font-medium text-gray-800">{settings.company_address}</span></div>
                                  )}
                                  {settings.company_phone && (
                                    <div><span className="text-gray-400">Phone:</span> <span className="font-medium text-gray-800">{settings.company_phone}</span></div>
                                  )}
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
                                  <div><span className="text-gray-400">Quote #:</span> <span className="font-medium text-gray-800">Q-2025-0001</span></div>
                                  <div><span className="text-gray-400">Date:</span> <span className="font-medium text-gray-800">December 11, 2025</span></div>
                                  <div><span className="text-gray-400">Location:</span> <span className="font-medium text-gray-800">New Jersey</span></div>
                                  <div><span className="text-gray-400">Equipment:</span> <span className="font-medium text-gray-800">CAT D6</span></div>
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

              {/* Colors */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Colors</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.primary_color}
                        onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={settings.primary_color}
                        onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                        className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.secondary_color}
                        onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={settings.secondary_color}
                        onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                        className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.accent_color}
                        onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={settings.accent_color}
                        onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                        className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PDF Preferences */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">PDF Quote Preferences</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={settings.show_company_address}
                        onChange={(e) => setSettings({ ...settings, show_company_address: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Show address on quote</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={settings.show_company_phone}
                        onChange={(e) => setSettings({ ...settings, show_company_phone: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Show phone on quote</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={settings.show_company_email}
                        onChange={(e) => setSettings({ ...settings, show_company_email: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Show email on quote</span>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-sm text-gray-700">Quote validity (days):</label>
                    <input
                      type="number"
                      value={settings.quote_validity_days}
                      onChange={(e) => setSettings({ ...settings, quote_validity_days: parseInt(e.target.value) || 30 })}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Thank you for your business!"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                    <textarea
                      value={settings.terms_and_conditions || ''}
                      onChange={(e) => setSettings({ ...settings, terms_and_conditions: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Optional terms and conditions to appear on the quote..."
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <p className="text-sm text-gray-600">
                  Create templates with default costs for each location. These will auto-fill when generating quotes.
                </p>
                <button
                  onClick={openNewTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto flex-shrink-0"
                >
                  <span>+</span> New Template
                </button>
              </div>

              {/* Templates by Location */}
              {LOCATIONS.map(location => {
                const locationTemplates = templates.filter(t => t.location === location)
                return (
                  <div key={location} className="border rounded-lg">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h4 className="font-semibold text-gray-800">{location}</h4>
                    </div>
                    {locationTemplates.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 text-center">
                        No templates for this location
                      </div>
                    ) : (
                      <div className="divide-y">
                        {locationTemplates.map(template => (
                          <div key={template.id} className="p-3 sm:p-4 hover:bg-gray-50">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-gray-900">{template.name}</span>
                                  {template.is_default && (
                                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                      Default
                                    </span>
                                  )}
                                  {template.default_margin_percentage > 0 && (
                                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                      {template.default_margin_percentage}% margin
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 mt-1 truncate">
                                  {ALL_COST_FIELDS.filter(f => template[f.key as keyof QuoteTemplate]).map(f => f.label).join(', ') || 'No costs set'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {!template.is_default && (
                                  <button
                                    onClick={() => setDefaultTemplate(template)}
                                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-100"
                                  >
                                    Set Default
                                  </button>
                                )}
                                <button
                                  onClick={() => openEditTemplate(template)}
                                  className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteTemplate(template.id)}
                                  className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 sm:p-6 border-b z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'New Quote Template'}
              </h3>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Standard Rates"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <select
                    value={templateForm.location}
                    onChange={(e) => setTemplateForm({ ...templateForm, location: e.target.value as Location })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!!editingTemplate}
                  >
                    <option value="">Select location...</option>
                    {LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Margin %</label>
                <input
                  type="number"
                  step="0.1"
                  value={templateForm.default_margin_percentage}
                  onChange={(e) => setTemplateForm({ ...templateForm, default_margin_percentage: e.target.value })}
                  className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Default Costs</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {ALL_COST_FIELDS.map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={templateForm[field.key as keyof typeof templateForm] || ''}
                          onChange={(e) => setTemplateForm({ ...templateForm, [field.key]: e.target.value })}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white p-4 sm:p-6 border-t flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
