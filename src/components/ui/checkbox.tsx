'use client'

import { Check } from 'lucide-react'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: React.ReactNode
  disabled?: boolean
}

export default function Checkbox({ checked, onChange, label, disabled }: CheckboxProps) {
  return (
    <label className={`flex items-start space-x-3 text-xs group ${disabled ? '' : 'cursor-pointer'}`}>
      <div className={`relative w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
        checked
          ? 'bg-brand border-brand'
          : disabled
            ? 'bg-zinc-950 border-zinc-800 opacity-50'
            : 'bg-zinc-950 border-zinc-700 group-hover:border-zinc-500'
      }`}>
        {checked && <Check className="w-3.5 h-3.5 text-white" />}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <span className={`font-medium leading-relaxed ${disabled ? 'text-zinc-600' : 'text-zinc-400'}`}>
        {label}
      </span>
    </label>
  )
}
