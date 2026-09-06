'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

type FilterOption = {
  value: string
  label: string
}

type FilterSelectProps = {
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  ariaLabel: string
}

export function FilterSelect({ value, options, onChange, ariaLabel }: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const selectedOption = options.find(option => option.value === value) ?? options[0]
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value))

  const openAtSelectedOption = () => {
    setActiveIndex(selectedIndex)
    setOpen(true)
  }

  const selectOption = (index: number) => {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
  }

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-${activeIndex}` : undefined}
        onClick={() => open ? setOpen(false) : openAtSelectedOption()}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            setOpen(false)
            return
          }

          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) {
              openAtSelectedOption()
              return
            }
            const direction = event.key === 'ArrowDown' ? 1 : -1
            setActiveIndex(current => (current + direction + options.length) % options.length)
          }

          if (open && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            selectOption(activeIndex)
          }
        }}
        className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 text-left text-xs font-medium text-zinc-700 hover:border-zinc-300 focus:border-brand dark:border-white/[0.08] dark:bg-[#17191d] dark:text-zinc-200 dark:hover:border-zinc-600"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-[#30333a] dark:bg-[#1b1d22]"
        >
          {options.map((option, index) => {
            const selected = option.value === value
            const active = index === activeIndex

            return (
              <button
                key={option.value}
                id={`${listboxId}-${index}`}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(index)}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
                  selected
                    ? 'bg-brand/10 font-semibold text-brand'
                    : active
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-white/[0.05] dark:text-white'
                      : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <span>{option.label}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
