export default function SegmentedToggle({ label, options = ['Yes', 'No'], value, onChange, span }) {
  return (
    <div className={span === 2 ? 'col-span-2 flex flex-col gap-1.5 max-sm:col-span-1' : 'flex flex-col gap-1.5'}>
      <label className="text-[13px] font-semibold tracking-tight text-brand-900">{label}</label>
      <div className="inline-flex w-fit rounded-lg border border-brand-200 bg-brand-100/60 p-0.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange?.(opt)}
            className={
              'rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ' +
              (value === opt ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-700 hover:text-brand-900')
            }
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
