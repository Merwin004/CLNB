import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import SectionTabs, { SECTIONS } from '../components/encode/SectionTabs.jsx'
import PersonalInfoSection from '../components/encode/PersonalInfoSection.jsx'
import EducationSection from '../components/encode/EducationSection.jsx'
import HealthSection from '../components/encode/HealthSection.jsx'
import WorkSection from '../components/encode/WorkSection.jsx'
import FamilySection from '../components/encode/FamilySection.jsx'
import ServicesAvailedSection from '../components/encode/ServicesAvailedSection.jsx'
import ServicesRequestedSection from '../components/encode/ServicesRequestedSection.jsx'
import ProfileRoster from '../components/roster/ProfileRoster.jsx'
import { createBlankFormData } from '../data/blankFormData.js'
import { toFormData, toPatchPayload } from '../lib/profileMapper.js'
import { api, ApiError } from '../lib/api.js'

// One office exists so far — see ImportProfilesModal.jsx for the same
// simplification on the Excel-import side.
const NEW_PROFILE_CONTEXT = { year: 2027, regionalOfficeCode: 'NCR', fieldOfficeCode: '3' }

export default function EncodeChildProfile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { profileId } = useParams()
  const [activeSection, setActiveSection] = useState('A')

  const [profiles, setProfiles] = useState([])
  const [isLoadingRoster, setIsLoadingRoster] = useState(true)
  const [rosterError, setRosterError] = useState('')

  const [activeProfileId, setActiveProfileId] = useState(profileId ?? null)
  const [activeProfile, setActiveProfile] = useState(null) // raw child_profiles row, for header details
  const [formData, setFormData] = useState(createBlankFormData())
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState(null)

  const fetchProfiles = useCallback(async () => {
    setIsLoadingRoster(true)
    setRosterError('')
    try {
      const data = await api.listProfiles({ pageSize: 200 })
      setProfiles(data.profiles)
      return data.profiles
    } catch (err) {
      setRosterError(err instanceof ApiError ? err.message : 'Could not load profiles. Is the backend running?')
      return []
    } finally {
      setIsLoadingRoster(false)
    }
  }, [])

  useEffect(() => {
    fetchProfiles().then((list) => {
      if (!profileId && list.length > 0) setActiveProfileId(list[0].id)
    })
    // Only ever run once on mount — profileId changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lets links like the profiles table's "Edit" button (/encode/:profileId)
  // open directly on that profile instead of always defaulting to the first.
  useEffect(() => {
    if (profileId) setActiveProfileId(profileId)
  }, [profileId])

  // Reload the form whenever the selected profile changes (roster click or route param).
  useEffect(() => {
    if (!activeProfileId) return
    let cancelled = false
    setIsLoadingProfile(true)
    setLoadError('')
    setSaveError('')
    api
      .getProfile(activeProfileId)
      .then((data) => {
        if (cancelled) return
        setActiveProfile(data.profile)
        setFormData(toFormData(data))
        setActiveSection('A')
        setLastSavedAt(null)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this profile.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProfile(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeProfileId])

  // Section A is always at least started once a profile exists here.
  const completed = new Set(['A'])

  function updateField(section, field, value) {
    setFormData((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }))
  }

  function toggleChip(section, field, value) {
    setFormData((prev) => {
      const list = prev[section][field]
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
      return { ...prev, [section]: { ...prev[section], [field]: next } }
    })
  }

  function updateTableRow(section, field, rowIndex, key, value) {
    setFormData((prev) => {
      const rows = [...prev[section][field]]
      rows[rowIndex] = { ...rows[rowIndex], [key]: value }
      return { ...prev, [section]: { ...prev[section], [field]: rows } }
    })
  }

  function addTableRow(section, field, emptyRow) {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: [...prev[section][field], emptyRow] },
    }))
  }

  async function saveProfile(extraPatch) {
    if (!activeProfileId) return
    setIsSaving(true)
    setSaveError('')
    try {
      const { profile } = await api.updateProfile(activeProfileId, { ...toPatchPayload(formData), ...extraPatch })
      setActiveProfile(profile)
      setLastSavedAt(new Date())
      setProfiles((prev) => prev.map((p) => (p.id === activeProfileId ? { ...p, status: profile.status } : p)))
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save — check your connection and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveDraft() {
    await saveProfile({ status: 'draft' })
  }

  async function handleSaveAndContinue() {
    await saveProfile({})
    const index = SECTIONS.findIndex((s) => s.id === activeSection)
    if (index >= 0 && index < SECTIONS.length - 1) setActiveSection(SECTIONS[index + 1].id)
  }

  async function handleNewProfile() {
    try {
      const { profile } = await api.createProfile(NEW_PROFILE_CONTEXT)
      await fetchProfiles()
      setActiveProfileId(profile.id)
      navigate(`/encode/${profile.id}`)
    } catch (err) {
      setRosterError(err instanceof ApiError ? err.message : 'Could not create a new profile.')
    }
  }

  function handleSelectProfile(id) {
    setActiveProfileId(id)
    navigate(`/encode/${id}`)
  }

  return (
    <div className="flex h-screen overflow-hidden max-[920px]:h-auto max-[920px]:flex-col max-[920px]:overflow-visible">
      <main className="flex w-full min-w-0 flex-1 flex-col max-[920px]:h-auto">
        <div className="mx-auto w-full max-w-[920px] flex-none px-6 pt-8 sm:px-10">
          <div className="mb-5 flex flex-wrap items-start justify-end gap-4">
            {user && (
              <div className="flex flex-none items-center gap-3 pt-1">
                <Link
                  to="/profiles"
                  className="rounded-lg border border-brand-400 px-3 py-1.5 text-[12.5px] font-bold text-brand-900 hover:bg-brand-200/60"
                >
                  View all profiles
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

          <div className="mb-5">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium text-brand-700">
              <span>
                Year <b className="font-mono font-semibold text-brand-900">{activeProfile?.year ?? NEW_PROFILE_CONTEXT.year}</b>
              </span>
              <span>
                Regional Office{' '}
                <b className="font-mono font-semibold text-brand-900">
                  {activeProfile?.regional_office_code ?? NEW_PROFILE_CONTEXT.regionalOfficeCode}
                </b>
              </span>
              <span>
                Field Office <b className="font-mono font-semibold text-brand-900">Manila</b>
              </span>
              <span>
                Control No. <b className="font-mono font-semibold text-brand-900">{activeProfile?.control_no ?? '—'}</b>
              </span>
              <span>
                RO Code{' '}
                <b className="font-mono font-semibold text-brand-900">
                  {activeProfile?.regional_office_code ?? NEW_PROFILE_CONTEXT.regionalOfficeCode}
                </b>
              </span>
              <span>
                FO Code <b className="font-mono font-semibold text-brand-900">{activeProfile?.field_office_code ?? NEW_PROFILE_CONTEXT.fieldOfficeCode}</b>
              </span>
              <span>
                Child&rsquo;s ID No. <b className="font-mono font-semibold text-brand-900">{activeProfile?.child_id_no || '—'}</b>
              </span>
            </div>
          </div>

          <SectionTabs active={activeSection} onSelect={setActiveSection} completed={completed} />
        </div>

        {/* Only this pane scrolls — header, tabs, and footer stay put. */}
        <div className="scroll-hidden min-h-0 flex-1 overflow-y-auto max-[920px]:overflow-visible">
          <div className="mx-auto w-full max-w-[920px] px-6 sm:px-10">
            {loadError && (
              <div className="mb-4 rounded-lg border border-warn bg-warn-soft px-3.5 py-2.5 text-[13px] font-medium text-warn">
                {loadError}
              </div>
            )}
            {isLoadingProfile && <p className="py-10 text-center text-[13px] text-brand-700">Loading profile&hellip;</p>}
            {!isLoadingProfile && !activeProfileId && (
              <p className="py-10 text-center text-[13px] text-brand-700">
                {isLoadingRoster ? 'Loading…' : 'No profile selected — pick one from the roster or create a new one.'}
              </p>
            )}
            {!isLoadingProfile && activeProfileId && (
              <>
                {activeSection === 'A' && (
                  <PersonalInfoSection data={formData.personal} onChange={(field, value) => updateField('personal', field, value)} />
                )}
                {activeSection === 'A1' && (
                  <EducationSection
                    data={formData.education}
                    onChange={(field, value) => updateField('education', field, value)}
                    onToggleChip={(field, value) => toggleChip('education', field, value)}
                  />
                )}
                {activeSection === 'A2' && (
                  <HealthSection
                    data={formData.health}
                    onChange={(field, value) => updateField('health', field, value)}
                    onToggleChip={(field, value) => toggleChip('health', field, value)}
                  />
                )}
                {activeSection === 'A3' && (
                  <WorkSection
                    data={formData.work}
                    onChange={(field, value) => updateField('work', field, value)}
                    onToggleChip={(field, value) => toggleChip('work', field, value)}
                  />
                )}
                {activeSection === 'B' && (
                  <FamilySection
                    data={formData.family}
                    onChange={(field, value) => updateField('family', field, value)}
                    onMemberChange={(rowIndex, key, value) => updateTableRow('family', 'members', rowIndex, key, value)}
                    onAddMember={() =>
                      addTableRow('family', 'members', { name: '', relationship: '', age: '', occupation: '', income: '' })
                    }
                  />
                )}
                {activeSection === 'C1' && (
                  <ServicesAvailedSection
                    data={formData.servicesAvailed}
                    onRecordChange={(rowIndex, key, value) => updateTableRow('servicesAvailed', 'records', rowIndex, key, value)}
                    onAddRecord={() =>
                      addTableRow('servicesAvailed', 'records', { assistance: '', source: '', year: '', availedBy: '', remarks: '' })
                    }
                  />
                )}
                {activeSection === 'C2' && (
                  <ServicesRequestedSection
                    data={formData.servicesRequested}
                    onRecordChange={(rowIndex, key, value) => updateTableRow('servicesRequested', 'records', rowIndex, key, value)}
                    onAddRecord={() =>
                      addTableRow('servicesRequested', 'records', { assistance: '', source: '', period: '', requestedBy: '', remarks: '' })
                    }
                  />
                )}
              </>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[920px] flex-none px-6 py-4 sm:px-10">
          <div className="flex items-center justify-between border-t border-brand-200 pt-4">
            <span className="text-[13px] font-medium text-brand-700">
              {saveError ? (
                <span className="text-warn">{saveError}</span>
              ) : lastSavedAt ? (
                `Last saved ${lastSavedAt.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}`
              ) : (
                'Not saved yet'
              )}
            </span>
            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={!activeProfileId || isSaving}
                onClick={handleSaveDraft}
                className="rounded-lg border border-brand-400 px-4 py-2.5 text-sm font-bold text-brand-900 hover:bg-brand-200/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={!activeProfileId || isSaving}
                onClick={handleSaveAndContinue}
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save & continue'}
              </button>
            </div>
          </div>
        </div>
      </main>

      <ProfileRoster
        profiles={profiles}
        isLoading={isLoadingRoster}
        activeId={activeProfileId}
        onSelect={handleSelectProfile}
        onNew={handleNewProfile}
      />
      {rosterError && (
        <div className="fixed bottom-4 right-4 max-w-sm rounded-lg border border-warn bg-warn-soft px-3.5 py-2.5 text-[13px] font-medium text-warn shadow-lg">
          {rosterError}
        </div>
      )}
    </div>
  )
}
