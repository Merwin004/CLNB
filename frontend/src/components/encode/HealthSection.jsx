import FieldGroup from '../form/FieldGroup.jsx'
import TextField from '../form/TextField.jsx'
import SegmentedToggle from '../form/SegmentedToggle.jsx'
import ChipGroup from '../form/ChipGroup.jsx'
import { ailmentOptions, familyAilmentOptions } from '../../data/formOptions.js'

export default function HealthSection({ data, onChange, onToggleChip }) {
  const set = (field) => (e) => onChange(field, e.target.value)

  return (
    <>
      <FieldGroup title="Disability">
        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
          <SegmentedToggle label="Has a disability?" value={data.hasDisability} onChange={(v) => onChange('hasDisability', v)} />
          <TextField label="Height (cm)" type="number" value={data.height} onChange={set('height')} />
          <TextField label="Weight (kg)" type="number" value={data.weight} onChange={set('weight')} />
        </div>
      </FieldGroup>

      <FieldGroup title="Ailments in the last six months">
        <ChipGroup options={ailmentOptions} selected={data.ailments} onToggle={(v) => onToggleChip('ailments', v)} />
      </FieldGroup>

      <FieldGroup title="Family history of ailments">
        <ChipGroup options={familyAilmentOptions} selected={data.familyAilments} onToggle={(v) => onToggleChip('familyAilments', v)} />
      </FieldGroup>
    </>
  )
}
