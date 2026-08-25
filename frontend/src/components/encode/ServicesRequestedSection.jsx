import FieldGroup from '../form/FieldGroup.jsx'
import MiniTable from '../form/MiniTable.jsx'

const columns = [
  { key: 'assistance', label: 'Assistance requested' },
  { key: 'source', label: 'Source' },
  { key: 'period', label: 'Start–End' },
  { key: 'requestedBy', label: 'Requested by' },
  { key: 'remarks', label: 'Remarks' },
]

export default function ServicesRequestedSection({ data, onRecordChange, onAddRecord }) {
  return (
    <FieldGroup title="Services requested for availment">
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
