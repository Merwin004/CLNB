import { useState } from 'react'
import { api, ApiError } from '../../lib/api.js'

// Year/RO/FO are fixed for now — the whole app currently operates under a
// single office context (matches the header shown on every encode screen).
// Revisit once more than one office exists.
const IMPORT_CONTEXT = { year: 2027, regionalOfficeCode: 'NCR', fieldOfficeCode: '3' }

export default function ImportProfilesModal({ onClose, onImported }) {
  const [file, setFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return
    setError('')
    setIsSubmitting(true)
    try {
      const data = await api.importProfiles(file, IMPORT_CONTEXT)
      setResult(data)
      if (data.created > 0) onImported()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-[480px] rounded-2xl border border-brand-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-brand-900">Import from Excel</h2>
            <p className="mt-1 text-[13px] text-brand-700">Creates new draft profiles from an .xlsx file — one row per child.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-brand-700 hover:bg-brand-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <a
          href="/child-profile-import-template.xlsx"
          download
          className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-brand-900 underline decoration-brand-400 underline-offset-2 hover:text-accent"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Download the template
        </a>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-lg border border-brand-200 bg-brand-100/60 px-3 py-2 text-[13px] text-brand-900 file:mr-3 file:rounded-md file:border-0 file:bg-brand-900 file:px-3 file:py-1.5 file:text-[12.5px] file:font-bold file:text-white"
          />

          {error && (
            <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn">
              {error}
            </p>
          )}

          {result && (
            <div className="rounded-lg border border-brand-200 bg-brand-100/60 p-3 text-[13px]">
              <p className="font-semibold text-good">{result.created} profile(s) created</p>
              {result.skipped > 0 && (
                <>
                  <p className="mt-1 font-semibold text-warn">{result.skipped} row(s) skipped</p>
                  <ul className="mt-1 max-h-32 list-inside list-disc overflow-y-auto text-brand-700">
                    {result.errors.map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <div className="mt-1 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-brand-400 px-4 py-2 text-[13px] font-bold text-brand-900 hover:bg-brand-200/60"
            >
              {result ? 'Close' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!file || isSubmitting}
              className="rounded-lg bg-brand-900 px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Importing…' : 'Upload and import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
