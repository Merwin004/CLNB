export default function SelectField({ label, required, span, options, ...selectProps }) {
  return (
    <div className={span === 2 ? 'col-span-2 flex flex-col gap-1.5 max-sm:col-span-1' : 'flex flex-col gap-1.5'}>
      <label className="flex items-center gap-1 text-[13px] font-semibold tracking-tight text-brand-900">
        {label}
        {required && <span className="font-bold text-accent">*</span>}
      </label>
      <select
        className="w-full appearance-none rounded-lg border border-brand-200 bg-brand-100/60 bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2020%2020%27%20fill=%27none%27%3E%3Cpath%20d=%27M5.5%208l4.5%204.5L14.5%208%27%20stroke=%27%236B8191%27%20stroke-width=%271.6%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat py-2 pl-2.5 pr-7 text-[13.5px] font-medium text-brand-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-55"
        {...selectProps}
      >
        {options.map((opt) => {
          const value = typeof opt === 'string' ? opt : opt.label
          return (
            <option key={value} value={value}>
              {value}
            </option>
          )
        })}
      </select>
    </div>
  )
}
