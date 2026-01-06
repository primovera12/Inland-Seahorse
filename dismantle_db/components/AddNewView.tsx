'use client'

import { useState, useEffect } from 'react'
import { supabase, Make, Model } from '@/lib/supabase'
import { sortMakesByPopularity } from '@/lib/sorting'

interface AddNewViewProps {
  onShowToast: (message: string, type: 'success' | 'error') => void
}

interface NewModel {
  name: string
  price: string
}

export default function AddNewView({ onShowToast }: AddNewViewProps) {
  const [makes, setMakes] = useState<Make[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // New make form
  const [newMakeName, setNewMakeName] = useState('')

  // Models to add for the new make
  const [modelsToAdd, setModelsToAdd] = useState<NewModel[]>([{ name: '', price: '' }])

  // Created make (after saving)
  const [createdMake, setCreatedMake] = useState<Make | null>(null)

  // Search filter for existing makes
  const [makeSearch, setMakeSearch] = useState('')

  useEffect(() => {
    fetchMakes()
  }, [])

  const fetchMakes = async () => {
    try {
      const { data, error } = await supabase.from('makes').select('*')
      if (error) throw error
      if (data) {
        const sortedMakes = sortMakesByPopularity(data, (make) => make.name)
        setMakes(sortedMakes)
      }
    } catch (error) {
      onShowToast('Failed to load makes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const addModelField = () => {
    setModelsToAdd(prev => [...prev, { name: '', price: '' }])
  }

  const removeModelField = (index: number) => {
    setModelsToAdd(prev => prev.filter((_, i) => i !== index))
  }

  const updateModelField = (index: number, field: keyof NewModel, value: string) => {
    setModelsToAdd(prev => prev.map((model, i) =>
      i === index ? { ...model, [field]: value } : model
    ))
  }

  const handleCreateMake = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMakeName.trim()) {
      onShowToast('Please enter a make name', 'error')
      return
    }

    // Check if make already exists
    const existingMake = makes.find(m => m.name.toLowerCase() === newMakeName.trim().toLowerCase())
    if (existingMake) {
      onShowToast(`Make "${newMakeName}" already exists`, 'error')
      return
    }

    setSaving(true)
    try {
      // Create the make
      const { data: newMake, error: makeError } = await supabase
        .from('makes')
        .insert({ name: newMakeName.trim() })
        .select()
        .single()

      if (makeError) {
        if (makeError.message?.includes('duplicate') || makeError.code === '23505') {
          onShowToast(`Make "${newMakeName}" already exists`, 'error')
        } else {
          onShowToast(`Failed to create make: ${makeError.message}`, 'error')
        }
        setSaving(false)
        return
      }

      // Filter out empty models
      const validModels = modelsToAdd.filter(m => m.name.trim())

      // Create models if any were specified
      let modelsCreated = 0
      for (const model of validModels) {
        const { data: newModel, error: modelError } = await supabase
          .from('models')
          .insert({ name: model.name.trim(), make_id: newMake.id })
          .select()
          .single()

        if (!modelError && newModel) {
          // Create rate entry
          const priceNum = model.price ? parseFloat(model.price) : null
          await supabase.from('rates').insert({
            make_id: newMake.id,
            model_id: newModel.id,
            price: priceNum,
          })
          modelsCreated++
        }
      }

      setCreatedMake(newMake)

      if (modelsCreated > 0) {
        onShowToast(`Make "${newMakeName}" created with ${modelsCreated} model(s)`, 'success')
      } else {
        onShowToast(`Make "${newMakeName}" created successfully`, 'success')
      }

      // Reset form
      setNewMakeName('')
      setModelsToAdd([{ name: '', price: '' }])

      // Refresh makes list
      fetchMakes()
    } catch (error: any) {
      onShowToast(`Error: ${error.message || 'Failed to create make'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddMoreModels = async () => {
    if (!createdMake) return

    const validModels = modelsToAdd.filter(m => m.name.trim())
    if (validModels.length === 0) {
      onShowToast('Please enter at least one model name', 'error')
      return
    }

    setSaving(true)
    let modelsCreated = 0

    try {
      for (const model of validModels) {
        const { data: newModel, error: modelError } = await supabase
          .from('models')
          .insert({ name: model.name.trim(), make_id: createdMake.id })
          .select()
          .single()

        if (!modelError && newModel) {
          const priceNum = model.price ? parseFloat(model.price) : null
          await supabase.from('rates').insert({
            make_id: createdMake.id,
            model_id: newModel.id,
            price: priceNum,
          })
          modelsCreated++
        }
      }

      if (modelsCreated > 0) {
        onShowToast(`Added ${modelsCreated} model(s) to ${createdMake.name}`, 'success')
        setModelsToAdd([{ name: '', price: '' }])
      }
    } catch (error: any) {
      onShowToast(`Error: ${error.message || 'Failed to add models'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setCreatedMake(null)
    setNewMakeName('')
    setModelsToAdd([{ name: '', price: '' }])
  }

  const filteredMakes = makeSearch
    ? makes.filter(m => m.name.toLowerCase().includes(makeSearch.toLowerCase()))
    : makes

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-gray-200 animate-pulse rounded h-10" />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-200 animate-pulse rounded h-8" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Add New Make Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {!createdMake ? (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-6">Add New Make</h2>
              <form onSubmit={handleCreateMake} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newMakeName}
                    onChange={(e) => setNewMakeName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    placeholder="e.g., Caterpillar, Komatsu, Hitachi..."
                  />
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Initial Models <span className="text-gray-400 text-xs font-normal">(optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={addModelField}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add another
                    </button>
                  </div>

                  <div className="space-y-3">
                    {modelsToAdd.map((model, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={model.name}
                          onChange={(e) => updateModelField(index, 'name', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                          placeholder="Model name"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={model.price}
                          onChange={(e) => updateModelField(index, 'price', e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                          placeholder="Price"
                        />
                        {modelsToAdd.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeModelField(index)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                    saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    'Create Make'
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Add Models to {createdMake.name}</h2>
                <button
                  onClick={resetForm}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Create another make
                </button>
              </div>

              <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-sm text-green-800">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Make "{createdMake.name}" created! Add models below.
                </span>
              </div>

              <div className="space-y-3 mb-4">
                {modelsToAdd.map((model, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={model.name}
                      onChange={(e) => updateModelField(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                      placeholder="Model name"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={model.price}
                      onChange={(e) => updateModelField(index, 'price', e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                      placeholder="Price"
                    />
                    {modelsToAdd.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeModelField(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addModelField}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  + Add More Fields
                </button>
                <button
                  type="button"
                  onClick={handleAddMoreModels}
                  disabled={saving}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium text-white transition-colors ${
                    saving ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {saving ? 'Adding...' : 'Add Models'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Existing Makes Reference */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Existing Makes</h2>
          <p className="text-sm text-gray-500 mb-4">
            Reference list of existing makes ({makes.length} total)
          </p>

          <div className="relative mb-4">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={makeSearch}
              onChange={(e) => setMakeSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              placeholder="Search makes..."
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
            {filteredMakes.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {makeSearch ? 'No makes match your search' : 'No makes found'}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredMakes.map((make) => (
                  <li key={make.id} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    {make.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> To add models to an existing make, use the <strong>Data Entry</strong> tab and click the <strong>Add Model</strong> button after selecting a make.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
