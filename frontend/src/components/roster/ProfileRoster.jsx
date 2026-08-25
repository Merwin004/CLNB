import { useEffect, useMemo, useRef, useState } from 'react'
import ProfileRow from './ProfileRow.jsx'

const FILTERS = ['All', 'Draft', 'Complete']
// ProfileRow's fixed Tailwind sizing (p-2 padding, text sizes) makes each row
// ~54px tall, plus the ul's gap-0.5 (2px) between rows — update this if
// ProfileRow's padding changes.
const ROW_HEIGHT = 56
const MIN_PAGE_SIZE = 4
// Absorbs sub-pixel layout rounding (measured heights aren't always whole
// numbers) so the computed page size never overflows by a fraction of a row.
const SAFETY_MARGIN = 8

export default function ProfileRoster({ profiles, isLoading, activeId, onSelect, onNew }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)
  const listRef = useRef(null)
  const footerRef = useRef(null)
  const [pageSize, setPageSize] = useState(MIN_PAGE_SIZE)

  // Fixed page size, not internal scroll (see frontend-conventions.md's
  // fixed-shell pattern) — but a hardcoded count either wastes space on a
  // tall screen or overflows the sidebar on a short one. Instead, measure
  // whatever vertical space is actually free between the search/filter
  // header and the Prev/Next footer, and fit as many rows as fit.
  useEffect(() => {
    const list = listRef.current
    const footer = footerRef.current
    const aside = list?.closest('aside')
    if (!list || !footer || !aside) return

    const recompute = () => {
      const asideTop = aside.getBoundingClientRect().top
      const listTop = list.getBoundingClientRect().top
      const footerHeight = footer.getBoundingClientRect().height
      const available = aside.getBoundingClientRect().height - (listTop - asideTop) - footerHeight - SAFETY_MARGIN
      setPageSize(Math.max(MIN_PAGE_SIZE, Math.floor(available / ROW_HEIGHT)))
    }

    recompute()
    const observer = new ResizeObserver(recompute)
    observer.observe(aside)
    return () => observer.disconnect()
  }, [])

  const visible = useMemo(() => {
    return profiles.filter((p) => {
      const matchesQuery =
        query.trim() === '' ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.controlNo.toLowerCase().includes(query.toLowerCase())
      const matchesFilter =
        filter === 'All' || (filter === 'Draft' && p.status === 'draft') || (filter === 'Complete' && p.status === 'complete')
      return matchesQuery && matchesFilter
    })
  }, [profiles, query, filter])

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize))

  // Keep the current page in range when the filtered set shrinks (new search/filter).
  useEffect(() => {
    setPage(1)
  }, [query, filter])

  const clampedPage = Math.min(page, totalPages)
  const paged = visible.slice((clampedPage - 1) * pageSize, clampedPage * pageSize)

  return (
    <aside className="flex h-full w-[360px] flex-none flex-col bg-gradient-to-b from-brand-900 to-brand-700 px-5 py-7 max-[920px]:h-auto max-[920px]:w-full">
      <div className="flex flex-none gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-2.5 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-none text-white/60">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or control no."
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/60"
          />
        </label>
        <button
          type="button"
          onClick={onNew}
          className="flex flex-none items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-bold text-accent-ink hover:brightness-105"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          New
        </button>
      </div>

      <div className="mt-3.5 flex flex-none gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              'rounded-full border px-2.5 py-1 text-[12px] font-semibold ' +
              (filter === f ? 'border-white bg-white/15 text-white' : 'border-white/15 text-white/60 hover:text-white')
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* Fixed-size page of rows — no internal scroll, ever. pageSize is
          computed above to fill the space, not a guessed constant. */}
      <ul ref={listRef} className="mt-2 flex flex-none flex-col gap-0.5" style={{ minHeight: pageSize * ROW_HEIGHT }}>
        {isLoading && <li className="px-2 py-6 text-center text-[13px] text-white/60">Loading profiles&hellip;</li>}
        {!isLoading &&
          paged.map((profile) => (
            <ProfileRow key={profile.id} profile={profile} isActive={profile.id === activeId} onSelect={onSelect} onEdit={onSelect} />
          ))}
        {!isLoading && visible.length === 0 && <li className="px-2 py-6 text-center text-[13px] text-white/60">No profiles match.</li>}
      </ul>

      <div ref={footerRef} className="mt-auto flex-none">
        {/* Pushed down to sit just above the footer's divider line, instead of
            floating right under the list with empty space below it. */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={clampedPage <= 1}
            className="rounded-md border border-white/15 px-2.5 py-1 text-[12px] font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
          >
            &larr; Prev
          </button>
          <span className="font-mono text-[11.5px] text-white/60">
            Page {clampedPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={clampedPage >= totalPages}
            className="rounded-md border border-white/15 px-2.5 py-1 text-[12px] font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
          >
            Next &rarr;
          </button>
        </div>

        <div className="flex justify-between border-t border-white/15 pt-4 mt-4 text-[11.5px] text-white/70">
          <span>
            Field Office <b className="font-bold text-white">Manila</b>
          </span>
          <span>NCR &middot; 2027</span>
        </div>
      </div>
    </aside>
  )
}
