import FieldGroup from '../form/FieldGroup.jsx'
import MiniTable from '../form/MiniTable.jsx'

const columns = [
  { key: 'assistance', label: 'Assistance' },
  { key: 'source', label: 'Source' },
  { key: 'year', label: 'Year' },
  { key: 'availedBy', label: 'Availed by' },
  { key: 'remarks', label: 'Remarks' },
]

export default function ServicesAvailedSection({ data, onRecordChange, onAddRecord }) {
  return (
    <FieldGroup title="Services already availed by the family">
      <MiniTable
        columns={columns}
        rows={data.records}
        onChange={onRecordChange}
        onAddRow={onAddRecord}
        addLabel="+ Add record"
      />
    </FieldGroup>
  )
}
