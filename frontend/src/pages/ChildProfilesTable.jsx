import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/roster/Avatar.jsx'
import ImportProfilesModal from '../components/profiles/ImportProfilesModal.jsx'
import { statusLabel } from '../data/profiles.js'
import { api, ApiError } from '../lib/api.js'

const statusPillClasses = {
  complete: 'bg-good-soft text-good',
  draft: 'bg-warn-soft text-warn',
  in_review: 'bg-brand-200 text-brand-900',
}

function formatUpdatedAt(iso) {
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function SortIcon({ direction }) {
  if (!direction) {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-brand-400">
        <path d="M7 9l5-5 5 5M7 15l5 5 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return direction === 'asc' ? (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
      <path d="M7 15l5-5 5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
      <path d="M7 9l5 5 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ChildProfilesTable() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState([{ id: 'updatedAt', desc: true }])
  const [showImportModal, setShowImportModal] = useState(false)

  const [profiles, setProfiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      // pageSize 200: client-side sort/filter/pagination below handles the
      // rest. Fine for one office's caseload; a bigger dataset would need
      // real server-side paging wired into the table's state instead.
      const data = await api.listProfiles({ pageSize: 200 })
      setProfiles(data.profiles)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load profiles. Is the backend running?')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar size={30} tone="light" />
            <span className="font-semibold text-brand-900">{row.original.name}</span>
          </div>
        ),
      },
      {
        id: 'controlNo',
        accessorKey: 'controlNo',
        header: 'Control No.',
        cell: (info) => <span className="font-mono text-[12.5px] text-brand-700">{info.getValue()}</span>,
      },
      {
        id: 'fieldOffice',
        accessorKey: 'fieldOffice',
        header: 'Field Office',
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => {
          const status = info.getValue()
          return (
            <span className={'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ' + statusPillClasses[status]}>
              {statusLabel[status]}
            </span>
          )
        },
      },
      {
        id: 'updatedAt',
        accessorKey: 'updatedAt',
        header: 'Last updated',
        cell: (info) => <span className="text-brand-700">{formatUpdatedAt(info.getValue())}</span>,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            to={`/encode/${row.original.id}`}
            className="rounded-lg border border-brand-400 px-3 py-1.5 text-[12px] font-bold text-brand-900 hover:bg-brand-200/60"
          >
            Edit
          </Link>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: profiles,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  })

  return (
    // Matches the encode screen's fixed-shell convention (AppLayout is h-screen
    // overflow-hidden) — header stays put, only the table body scrolls. See
    // .claude/rules/frontend-conventions.md.
    <div className="flex h-screen flex-col overflow-hidden bg-brand-100 max-[920px]:h-auto max-[920px]:overflow-visible">
      <div className="mx-auto w-full max-w-[1100px] flex-none px-6 pt-8 sm:px-10">
        <div className="mb-6 flex flex-wrap items-start justify-end gap-4">
          {user && (
            <div className="flex flex-none items-center gap-3">
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-bold text-accent-ink hover:brightness-105"
              >
                Import from Excel
              </button>
              <Link
                to="/encode"
                className="rounded-lg border border-brand-400 px-3 py-1.5 text-[12.5px] font-bold text-brand-900 hover:bg-brand-200/60"
              >
                Back to encode
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
                className="rounded-lg border border-brand-400 px-3 py-1.5 text-[12.5px] font-bold text-brand-900 hover:bg-brand-200/60"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="scroll-hidden min-h-0 flex-1 overflow-y-auto px-6 pb-8 sm:px-10 max-[920px]:overflow-visible">
        <div className="mx-auto w-full max-w-[1100px] rounded-2xl border border-brand-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-brand-200 p-4">
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search name or control no."
              className="w-full max-w-[320px] rounded-lg border border-brand-200 bg-brand-100/60 px-3 py-2 text-[13.5px] text-brand-900 outline-none placeholder:text-brand-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
            <span className="flex-none font-mono text-[12px] text-brand-700">
              {table.getFilteredRowModel().rows.length} of {profiles.length}
            </span>
          </div>

          {loadError && (
            <div className="border-b border-brand-200 bg-warn-soft px-4 py-3 text-[13px] font-medium text-warn">{loadError}</div>
          )}

          <div className="scroll-hidden overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="border-b border-brand-200 px-4 py-3 text-left">
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-brand-700 hover:text-brand-900"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortIcon direction={header.column.getIsSorted()} />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {!isLoading &&
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-brand-100/40">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="border-b border-brand-200 px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                {isLoading && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] text-brand-700">
                      Loading profiles&hellip;
                    </td>
                  </tr>
                )}
                {!isLoading && table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] text-brand-700">
                      {profiles.length === 0 ? 'No profiles yet — import an Excel file to get started.' : 'No profiles match.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-4">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-md border border-brand-300 px-2.5 py-1 text-[12px] font-semibold text-brand-900 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              &larr; Prev
            </button>
            <span className="font-mono text-[11.5px] text-brand-700">
              Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
            </span>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-md border border-brand-300 px-2.5 py-1 text-[12px] font-semibold text-brand-900 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>

      {showImportModal && (
        <ImportProfilesModal onClose={() => setShowImportModal(false)} onImported={fetchProfiles} />
      )}
    </div>
  )
}
