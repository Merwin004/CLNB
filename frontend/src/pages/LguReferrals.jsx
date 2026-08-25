import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ReferralModal from '../components/lgu/ReferralModal.jsx'
import { api, ApiError } from '../lib/api.js'

function formatUpdatedAt(iso) {
  return new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })
}

export default function LguReferrals() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [profiles, setProfiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeReferral, setActiveReferral] = useState(null) // { profileId, name, service }

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const data = await api.listLguProfiles()
      setProfiles(data.profiles)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load referrals. Is the backend running?')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  // Flatten to one row per (profile, pending service) — each has its own
  // independent Refer action, so a nested per-child table just adds clicks.
  const rows = profiles.flatMap((p) => p.pendingServices.map((service) => ({ profile: p, service })))

  function handleReferred(serviceId) {
    setActiveReferral(null)
    setProfiles((prev) =>
      prev
        .map((p) => ({ ...p, pendingServices: p.pendingServices.filter((s) => s.id !== serviceId) }))
        .filter((p) => p.pendingServices.length > 0),
    )
  }

  return (
    // Matches the encode/profiles screens' fixed-shell convention — header
    // stays put, only the queue body scrolls. See frontend-conventions.md.
    <div className="flex h-screen flex-col overflow-hidden bg-brand-100 max-[920px]:h-auto max-[920px]:overflow-visible">
      <div className="mx-auto w-full max-w-[1100px] flex-none px-6 pt-8 sm:px-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <p className="pt-1 text-[13px] font-medium text-brand-700">
            {rows.length} pending service {rows.length === 1 ? 'request' : 'requests'}
          </p>
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
      </div>

      <div className="scroll-hidden min-h-0 flex-1 overflow-y-auto px-6 pb-8 sm:px-10 max-[920px]:overflow-visible">
        <div className="mx-auto w-full max-w-[1100px] rounded-2xl border border-brand-200 bg-white shadow-sm">
          {loadError && (
            <div className="border-b border-brand-200 bg-warn-soft px-4 py-3 text-[13px] font-medium text-warn">{loadError}</div>
          )}

          <div className="scroll-hidden overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['Child', 'Control No.', 'Service requested', 'Requested by', 'Last updated', ''].map((h) => (
                    <th
                      key={h}
                      className="border-b border-brand-200 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-brand-700"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!isLoading &&
                  rows.map(({ profile, service }) => (
                    <tr key={service.id} className="hover:bg-brand-100/40">
                      <td className="border-b border-brand-200 px-4 py-3 font-semibold text-brand-900">{profile.name}</td>
                      <td className="border-b border-brand-200 px-4 py-3 font-mono text-[12.5px] text-brand-700">{profile.controlNo}</td>
                      <td className="border-b border-brand-200 px-4 py-3">
                        <div className="text-brand-900">{service.assistance}</div>
                        {service.source && <div className="text-[12px] text-brand-700">Source: {service.source}</div>}
                      </td>
                      <td className="border-b border-brand-200 px-4 py-3 text-brand-700">{service.requestedBy || '—'}</td>
                      <td className="border-b border-brand-200 px-4 py-3 text-brand-700">{formatUpdatedAt(profile.updatedAt)}</td>
                      <td className="border-b border-brand-200 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setActiveReferral({ profileId: profile.id, name: profile.name, service })}
                          className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-bold text-accent-ink hover:brightness-105"
                        >
                          Refer
                        </button>
                      </td>
                    </tr>
                  ))}
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-brand-700">
                      Loading&hellip;
                    </td>
                  </tr>
                )}
                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-brand-700">
                      No pending service requests — everything&rsquo;s been referred.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {activeReferral && (
        <ReferralModal
          profileId={activeReferral.profileId}
          name={activeReferral.name}
          service={activeReferral.service}
          onClose={() => setActiveReferral(null)}
          onReferred={handleReferred}
        />
      )}
    </div>
  )
}
