export default function FieldGroup({ title, hint, children }) {
  return (
    <div className="mb-4 rounded-xl border border-brand-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight text-brand-900">{title}</h2>
      {hint && <p className="mb-4 mt-0.5 text-[13px] text-brand-700">{hint}</p>}
      <div className={hint ? '' : 'mt-4'}>{children}</div>
    </div>
  )
}
