import { useEffect, useState } from 'react'
import FieldGroup from '../form/FieldGroup.jsx'
import TextField from '../form/TextField.jsx'
import SelectField from '../form/SelectField.jsx'
import SegmentedToggle from '../form/SegmentedToggle.jsx'
import { religionOptions, livingWithOptions, dwellingMaterialOptions } from '../../data/formOptions.js'
import { api } from '../../lib/api.js'

function ageFromDob(dob) {
  if (!dob) return ''
  const diff = Date.now() - new Date(dob).getTime()
  return String(Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)))
}

// Region/Province/Municipality cascade live off the real geography tables
// (17 PH regions, ~1,600 municipalities/cities — see backend/scripts/
// seed-full-geography.mjs) instead of a hardcoded list, since a flat,
// unscoped option list can't reasonably hold that. Barangay stays a plain
// text field — the source DOLE workbook has no barangay master list at all
// (there are ~42,000 nationwide), so the real form doesn't validate it
// either; see backend/src/lib/geography.js.
function usePresentAddressOptions(data) {
  const [regions, setRegions] = useState([])
  const [provinces, setProvinces] = useState([])
  const [cities, setCities] = useState([])

  useEffect(() => {
    api.listRegions().then(setRegions).catch(() => setRegions([]))
  }, [])

  useEffect(() => {
    const region = regions.find((r) => r.name === data.region)
    if (!region) {
      setProvinces([])
      return
    }
    api
      .listProvinces(region.id)
      .then(setProvinces)
      .catch(() => setProvinces([]))
  }, [regions, data.region])

  useEffect(() => {
    const province = provinces.find((p) => p.name === data.province)
    if (!province) {
      setCities([])
      return
    }
    api
      .listCities(province.id)
      .then(setCities)
      .catch(() => setCities([]))
  }, [provinces, data.province])

  return {
    regionOptions: regions.map((r) => r.name),
    provinceOptions: provinces.map((p) => p.name),
    cityOptions: cities.map((c) => c.name),
  }
}

export default function PersonalInfoSection({ data, onChange }) {
  const set = (field) => (e) => onChange(field, e.target.value)
  const { regionOptions, provinceOptions, cityOptions } = usePresentAddressOptions(data)

  // Changing a level invalidates whatever was selected below it (a province
  // list is meaningless once the region changes, etc.) — clear those fields
  // rather than leave a stale value that no longer matches the new parent.
  function handleRegionChange(e) {
    onChange('region', e.target.value)
    onChange('province', '')
    onChange('municipality', '')
  }
  function handleProvinceChange(e) {
    onChange('province', e.target.value)
    onChange('municipality', '')
  }

  return (
    <>
      <FieldGroup title="Name" hint="As it appears on the child’s birth certificate.">
        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
          <TextField label="Last name" required value={data.lastName} onChange={set('lastName')} placeholder="e.g. Dela Cruz" />
          <TextField label="First name" required value={data.firstName} onChange={set('firstName')} placeholder="e.g. Juan" />
          <TextField label="Middle name" required value={data.middleName} onChange={set('middleName')} placeholder="—" />
        </div>
      </FieldGroup>

      <FieldGroup title="Present address" hint="Province and municipality/city narrow as you choose the level above; barangay is free text.">
        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
          <SelectField label="Region" required options={regionOptions} value={data.region} onChange={handleRegionChange} />
          <SelectField label="Province" required options={provinceOptions} value={data.province} onChange={handleProvinceChange} />
          <SelectField label="Municipality / City" required options={cityOptions} value={data.municipality} onChange={set('municipality')} />
          <TextField label="Barangay" required value={data.barangay} onChange={set('barangay')} placeholder="e.g. San Isidro" />
          <TextField label="Sitio / Purok / Block / Zone" value={data.sitio} onChange={set('sitio')} placeholder="Optional" />
          <TextField label="Phone / Mobile no." value={data.phone} onChange={set('phone')} placeholder="09XX XXX XXXX" />
        </div>
      </FieldGroup>

      <FieldGroup title="Personal details">
        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
          <SegmentedToggle label="Sex" options={['Male', 'Female']} value={data.sex} onChange={(v) => onChange('sex', v)} />
          <TextField label="Date of birth" required type="date" value={data.dob} onChange={set('dob')} />
          <TextField label="Age" type="number" value={ageFromDob(data.dob)} disabled />
          <SegmentedToggle label="Birth certificate" value={data.birthCertificate} onChange={(v) => onChange('birthCertificate', v)} />
          <SelectField label="Religion" span={2} options={religionOptions} value={data.religion} onChange={set('religion')} />
        </div>
      </FieldGroup>

      <FieldGroup title="Household">
        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
          <SegmentedToggle
            label="Part of an indigenous people’s group?"
            span={2}
            value={data.indigenous}
            onChange={(v) => onChange('indigenous', v)}
          />
          <SelectField label="Living with" options={livingWithOptions} value={data.livingWith} onChange={set('livingWith')} />
          <SelectField
            label="Construction material of dwelling"
            span={2}
            options={dwellingMaterialOptions.map((o) => o.label)}
            value={data.dwellingMaterial}
            onChange={set('dwellingMaterial')}
          />
        </div>
      </FieldGroup>
    </>
  )
}
