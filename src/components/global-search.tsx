'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import {
  Calculator,
  Truck,
  Building2,
  Users,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Search queries with debouncing
  const { data: searchResults, isLoading } = trpc.search.global.useQuery(
    { query },
    {
      enabled: query.length >= 2,
      staleTime: 1000,
    }
  )

  const handleSelect = useCallback(
    (type: string, id: string) => {
      setOpen(false)
      setQuery('')
      switch (type) {
        case 'quote':
          router.push(`/quotes/history?highlight=${id}`)
          break
        case 'inland':
          router.push(`/inland/history?highlight=${id}`)
          break
        case 'company':
          router.push(`/customers?highlight=${id}`)
          break
        case 'contact':
          router.push(`/contacts?highlight=${id}`)
          break
      }
    },
    [router]
  )

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Search...
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search quotes, companies, contacts..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.length < 2 ? (
            <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
          ) : isLoading ? (
            <CommandEmpty>Searching...</CommandEmpty>
          ) : !searchResults ||
            (searchResults.quotes.length === 0 &&
              searchResults.inlandQuotes.length === 0 &&
              searchResults.companies.length === 0 &&
              searchResults.contacts.length === 0) ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : (
            <>
              {searchResults.quotes.length > 0 && (
                <CommandGroup heading="Dismantling Quotes">
                  {searchResults.quotes.map((quote) => (
                    <CommandItem
                      key={quote.id}
                      value={`quote-${quote.id}`}
                      onSelect={() => handleSelect('quote', quote.id)}
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      <div className="flex flex-1 items-center justify-between">
                        <div>
                          <span className="font-medium">{quote.quote_number}</span>
                          <span className="ml-2 text-muted-foreground">
                            {quote.customer_name}
                          </span>
                        </div>
                        <span className="text-sm font-mono">
                          {formatCurrency(quote.total)}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {searchResults.inlandQuotes.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Inland Quotes">
                    {searchResults.inlandQuotes.map((quote) => (
                      <CommandItem
                        key={quote.id}
                        value={`inland-${quote.id}`}
                        onSelect={() => handleSelect('inland', quote.id)}
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        <div className="flex flex-1 items-center justify-between">
                          <div>
                            <span className="font-medium">{quote.quote_number}</span>
                            <span className="ml-2 text-muted-foreground">
                              {quote.customer_name}
                            </span>
                          </div>
                          <span className="text-sm font-mono">
                            {formatCurrency(quote.total)}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {searchResults.companies.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Companies">
                    {searchResults.companies.map((company) => (
                      <CommandItem
                        key={company.id}
                        value={`company-${company.id}`}
                        onSelect={() => handleSelect('company', company.id)}
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        <div className="flex flex-1 items-center justify-between">
                          <span className="font-medium">{company.name}</span>
                          {company.industry && (
                            <span className="text-sm text-muted-foreground">
                              {company.industry}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {searchResults.contacts.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Contacts">
                    {searchResults.contacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={`contact-${contact.id}`}
                        onSelect={() => handleSelect('contact', contact.id)}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        <div className="flex flex-1 items-center justify-between">
                          <span className="font-medium">{contact.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {contact.email}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
