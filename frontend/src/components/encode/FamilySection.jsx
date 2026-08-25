import FieldGroup from '../form/FieldGroup.jsx'
import TextField from '../form/TextField.jsx'
import SegmentedToggle from '../form/SegmentedToggle.jsx'
import MiniTable from '../form/MiniTable.jsx'

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'relationship', label: 'Relationship' },
  { key: 'age', label: 'Age' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'income', label: 'Monthly income' },
]

export default function FamilySection({ data, onChange, onMemberChange, onAddMember }) {
  const set = (field) => (e) => onChange(field, e.target.value)

  return (
    <>
      <FieldGroup title="Household members" hint="One row per family member living with the child.">
        <MiniTable
          columns={columns}
          rows={data.members}
          onChange={onMemberChange}
          onAddRow={onAddMember}
          addLabel="+ Add family member"
        />
      </FieldGroup>

      <FieldGroup title="4Ps membership">
        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
          <SegmentedToggle label="Part of Pantawid Pamilya (4Ps)?" value={data.is4Ps} onChange={(v) => onChange('is4Ps', v)} />
          <TextField label="Household ID number" span={2} value={data.householdId} onChange={set('householdId')} />
        </div>
      </FieldGroup>
    </>
  )
}
