import { useState } from 'react'
import { api, ApiError } from '../../lib/api.js'

const AGENCIES = ['DOLE', 'DSWD']

export default function ReferralModal({ profileId, name, service, onClose, onReferred }) {
  const [error, setError] = useState('')
  const [submittingAgency, setSubmittingAgency] = useState(null)

  async function handleRefer(agency) {
    setError('')
    setSubmittingAgency(agency)
    try {
      await api.createReferral({ profileId, serviceRequestedId: service.id, agency })
      onReferred(service.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmittingAgency(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-[420px] rounded-2xl border border-brand-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-brand-900">Refer this request</h2>
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

        <div className="mt-3 rounded-lg border border-brand-200 bg-brand-100/60 p-3 text-[13px]">
          <p className="font-semibold text-brand-900">{name}</p>
          <p className="mt-0.5 text-brand-700">{service.assistance}</p>
          {service.requestedBy && <p className="mt-0.5 text-brand-700">Requested by {service.requestedBy}</p>}
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn">
            {error}
          </p>
        )}

        <p className="mt-4 text-[13px] font-semibold text-brand-900">Refer to:</p>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          {AGENCIES.map((agency) => (
            <button
              key={agency}
              type="button"
              disabled={submittingAgency !== null}
              onClick={() => handleRefer(agency)}
              className="rounded-lg bg-accent px-4 py-3 text-sm font-bold text-accent-ink hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submittingAgency === agency ? 'Referring…' : agency}
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submittingAgency !== null}
            className="rounded-lg border border-brand-400 px-4 py-2 text-[13px] font-bold text-brand-900 hover:bg-brand-200/60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
