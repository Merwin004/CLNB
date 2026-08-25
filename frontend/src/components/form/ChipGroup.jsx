export default function ChipGroup({ label, hint, options, selected, onToggle }) {
  return (
    <div>
      {label && <label className="text-[13px] font-semibold tracking-tight text-brand-900">{label}</label>}
      {hint && <p className="mt-0.5 text-[13px] text-brand-700">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              aria-pressed={isSelected}
              className={
                'rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ' +
                (isSelected
                  ? 'border-accent bg-accent-soft font-semibold text-accent-ink'
                  : 'border-brand-200 bg-brand-100/60 text-brand-900 hover:border-brand-500')
              }
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
