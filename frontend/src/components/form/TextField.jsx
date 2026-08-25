export default function TextField({ label, required, span, type = 'text', ...inputProps }) {
  return (
    <div className={span === 2 ? 'col-span-2 flex flex-col gap-1.5 max-sm:col-span-1' : 'flex flex-col gap-1.5'}>
      <label className="flex items-center gap-1 text-[13px] font-semibold tracking-tight text-brand-900">
        {label}
        {required && <span className="font-bold text-accent">*</span>}
      </label>
      <input
        type={type}
        className="w-full rounded-lg border border-brand-200 bg-brand-100/60 px-2.5 py-2 text-[13.5px] font-medium text-brand-900 outline-none placeholder:font-normal placeholder:text-brand-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-55"
        {...inputProps}
      />
    </div>
  )
}
