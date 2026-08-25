import FieldGroup from '../form/FieldGroup.jsx'
import TextField from '../form/TextField.jsx'
import SelectField from '../form/SelectField.jsx'
import SegmentedToggle from '../form/SegmentedToggle.jsx'
import ChipGroup from '../form/ChipGroup.jsx'
import { formOfEducationOptions, highestGradeOptions, dropoutReasonOptions } from '../../data/formOptions.js'

export default function EducationSection({ data, onChange, onToggleChip }) {
  const set = (field) => (e) => onChange(field, e.target.value)

  return (
    <>
      <FieldGroup title="Schooling">
        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
          <SegmentedToggle label="Ever gone to school?" value={data.everWentToSchool} onChange={(v) => onChange('everWentToSchool', v)} />
          <SegmentedToggle label="Attending at present?" value={data.attendingNow} onChange={(v) => onChange('attendingNow', v)} />
          <SelectField label="Highest grade completed" options={highestGradeOptions} value={data.highestGrade} onChange={set('highestGrade')} />
          <SelectField label="Form of education" span={2} options={formOfEducationOptions} value={data.formOfEducation} onChange={set('formOfEducation')} />
          <TextField label="Age when stopped schooling" type="number" value={data.ageStopped} onChange={set('ageStopped')} />
        </div>
      </FieldGroup>

      <FieldGroup title="Reasons for never attending / dropping out">
        <ChipGroup
          label=""
          hint="Select all that apply."
          options={dropoutReasonOptions}
          selected={data.dropoutReasons}
          onToggle={(v) => onToggleChip('dropoutReasons', v)}
        />
      </FieldGroup>
    </>
  )
}
