export const SECTIONS = [
  { id: 'A', code: 'A', label: 'Personal' },
  { id: 'A1', code: 'A1', label: 'Education' },
  { id: 'A2', code: 'A2', label: 'Health' },
  { id: 'A3', code: 'A3', label: 'Work' },
  { id: 'B', code: 'B', label: 'Family' },
  { id: 'C1', code: 'C1', label: 'Availed' },
  { id: 'C2', code: 'C2', label: 'Requested' },
]

export default function SectionTabs({ active, onSelect, completed }) {
  return (
    <nav role="tablist" aria-label="Form sections" className="scroll-hidden mb-6 flex gap-1 overflow-x-auto border-b border-brand-200">
      {SECTIONS.map((section) => {
        const isActive = section.id === active
        const isDone = completed.has(section.id)
        return (
          <button
            key={section.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(section.id)}
            className={
              'mb-[-1px] flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 pb-3 pt-2.5 text-sm font-semibold ' +
              (isActive ? 'border-accent text-brand-900' : 'border-transparent text-brand-700 hover:text-brand-900')
            }
          >
            <span
              className={
                'h-1.5 w-1.5 rounded-full ' +
                (isActive ? 'bg-accent' : isDone ? 'bg-good' : 'bg-brand-400')
              }
            />
            {section.code} <span className="text-[12.5px] font-medium text-brand-700">{section.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
