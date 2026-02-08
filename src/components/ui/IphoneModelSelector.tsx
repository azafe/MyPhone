import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'

type Group = { label: string; options: string[] }

const GROUPS: Group[] = [
  { label: 'SE', options: ['iPhone SE (2020)', 'iPhone SE (2022)'] },
  { label: '11', options: ['iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max'] },
  { label: '12', options: ['iPhone 12', 'iPhone 12 mini', 'iPhone 12 Pro', 'iPhone 12 Pro Max'] },
  { label: '13', options: ['iPhone 13', 'iPhone 13 mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max'] },
  { label: '14', options: ['iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max'] },
  { label: '15', options: ['iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max'] },
  { label: '16', options: ['iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max'] },
]

export function IphoneModelSelector({
  value,
  onChange,
  disabled,
  onOther,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  onOther: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) setQuery(value)
  }, [value, open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return GROUPS
    return GROUPS.map((group) => ({
      label: group.label,
      options: group.options.filter((opt) => opt.toLowerCase().includes(q)),
    })).filter((group) => group.options.length > 0)
  }, [query])

  const handleSelect = (option: string) => {
    onChange(option)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        value={open ? query : value}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        disabled={disabled}
        placeholder="Buscar modelo iPhone"
        className={cn(
          'h-11 w-full rounded-xl border border-[#E6EBF2] bg-white px-3.5 text-sm text-[#0F172A] shadow-[0_1px_2px_rgba(16,24,40,0.06)] placeholder:text-[#94A3B8] focus:border-[#0B4AA2] focus:outline-none focus:ring-2 focus:ring-[rgba(11,74,162,0.25)]',
          disabled && 'cursor-not-allowed bg-[#F8FAFC] text-[#94A3B8]'
        )}
      />
      {open && !disabled && (
        <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-[#E6EBF2] bg-white p-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-[#5B677A]">Sin resultados</div>
          )}
          {filtered.map((group) => (
            <div key={group.label} className="py-1">
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5B677A]">
                {group.label}
              </div>
              {group.options.map((option) => (
                <button
                  type="button"
                  key={option}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(option)}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
                >
                  {option}
                </button>
              ))}
            </div>
          ))}
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onOther}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[#0B4AA2] hover:bg-[rgba(11,74,162,0.08)]"
          >
            Otro iPhone…
          </button>
        </div>
      )}
    </div>
  )
}
