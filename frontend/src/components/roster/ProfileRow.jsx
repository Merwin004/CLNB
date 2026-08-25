import Avatar from './Avatar.jsx'
import { statusLabel } from '../../data/profiles.js'

const pillClasses = {
  complete: 'bg-good-soft text-good',
  draft: 'bg-warn-soft text-warn',
  in_review: 'bg-white/15 text-white',
}

export default function ProfileRow({ profile, isActive, onSelect, onEdit }) {
  return (
    <li
      onClick={() => onSelect(profile.id)}
      className={
        'flex cursor-pointer items-center gap-2.5 rounded-lg border p-2 ' +
        (isActive ? 'border-white/15 bg-white/20' : 'border-transparent hover:bg-white/10')
      }
    >
      <Avatar />
      <span className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{profile.name}</div>
        <div className="truncate font-mono text-[11px] text-white/70">{profile.controlNo}</div>
      </span>
      <span className={'flex-none rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ' + pillClasses[profile.status]}>
        {statusLabel[profile.status]}
      </span>
      <button
        type="button"
        title={`Edit ${profile.name}`}
        aria-label={`Edit ${profile.name}`}
        onClick={(e) => {
          e.stopPropagation()
          onEdit(profile.id)
        }}
        className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:border-accent hover:bg-accent hover:text-accent-ink"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M4 20l1-4.2L15.8 5 19 8.2 8.2 19 4 20z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      </button>
    </li>
  )
}
