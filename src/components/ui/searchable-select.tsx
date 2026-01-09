'use client'

import * as React from 'react'
import { useState, useRef, useEffect, useMemo } from 'react'
import { CheckIcon, ChevronDownIcon, Search, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface SearchableSelectOption {
  value: string
  label: string
  description?: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  allowCustom?: boolean
  customPlaceholder?: string
  onCustomAdd?: (customValue: string) => void
  emptyMessage?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false,
  className = '',
  triggerClassName = '',
  allowCustom = false,
  customPlaceholder = 'Add custom...',
  onCustomAdd,
  emptyMessage = 'No results found',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const customInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options
    const lowerSearch = searchTerm.toLowerCase()
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(lowerSearch) ||
        option.description?.toLowerCase().includes(lowerSearch)
    )
  }, [options, searchTerm])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
        setShowCustomInput(false)
        setCustomValue('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Focus custom input when showing
  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      setTimeout(() => customInputRef.current?.focus(), 50)
    }
  }, [showCustomInput])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
    setShowCustomInput(false)
    setCustomValue('')
  }

  const handleCustomAdd = () => {
    if (customValue.trim() && onCustomAdd) {
      onCustomAdd(customValue.trim())
      setCustomValue('')
      setShowCustomInput(false)
      setIsOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchTerm('')
    }
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-colors',
          'border-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none',
          disabled
            ? 'cursor-not-allowed opacity-50 bg-muted'
            : isOpen
            ? 'border-ring ring-ring/50 ring-[3px]'
            : 'hover:bg-accent/50',
          triggerClassName
        )}
      >
        <span className={cn('flex-1 text-left truncate', !selectedOption && 'text-muted-foreground')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon
          className={cn('h-4 w-4 opacity-50 shrink-0 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-8 h-8 text-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-[240px] overflow-y-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'relative flex w-full items-center gap-2 rounded-sm py-2 px-2 pr-8 text-sm outline-none transition-colors',
                    'hover:bg-accent hover:text-accent-foreground cursor-pointer',
                    option.value === value && 'bg-accent/50'
                  )}
                >
                  <div className="flex-1 text-left">
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    )}
                  </div>
                  {option.value === value && (
                    <CheckIcon className="absolute right-2 h-4 w-4 text-primary" />
                  )}
                </button>
              ))
            ) : (
              <div className="py-4 px-2 text-sm text-muted-foreground text-center">
                {emptyMessage}
              </div>
            )}
          </div>

          {/* Custom Entry Section */}
          {allowCustom && (
            <div className="border-t border-border p-2">
              {showCustomInput ? (
                <div className="flex gap-2">
                  <Input
                    ref={customInputRef}
                    type="text"
                    placeholder={customPlaceholder}
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCustomAdd()
                      }
                    }}
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 px-3"
                    onClick={handleCustomAdd}
                    disabled={!customValue.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      setShowCustomInput(false)
                      setCustomValue('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="flex w-full items-center gap-2 rounded-sm py-2 px-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add custom option</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
