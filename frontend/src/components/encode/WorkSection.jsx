import FieldGroup from '../form/FieldGroup.jsx'
import TextField from '../form/TextField.jsx'
import SelectField from '../form/SelectField.jsx'
import ChipGroup from '../form/ChipGroup.jsx'
import { taskPerformedOptions, workArrangementOptions, hazardOptions } from '../../data/formOptions.js'

export default function WorkSection({ data, onChange, onToggleChip }) {
  const set = (field) => (e) => onChange(field, e.target.value)

  return (
    <>
      <FieldGroup title="Nature of work">
        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
          <SelectField label="Specific task performed" span={2} options={taskPerformedOptions} value={data.taskPerformed} onChange={set('taskPerformed')} />
          <TextField label="Age started working" type="number" value={data.ageStarted} onChange={set('ageStarted')} />
          <SelectField label="Present work arrangement" span={2} options={workArrangementOptions} value={data.workArrangement} onChange={set('workArrangement')} />
          <TextField label="Hours per day" type="number" value={data.hoursPerDay} onChange={set('hoursPerDay')} />
          <TextField label="Days per week" type="number" value={data.daysPerWeek} onChange={set('daysPerWeek')} />
        </div>
      </FieldGroup>

      <FieldGroup title="Exposure to risks and hazards">
        <ChipGroup options={hazardOptions} selected={data.hazards} onToggle={(v) => onToggleChip('hazards', v)} />
      </FieldGroup>
    </>
  )
}
