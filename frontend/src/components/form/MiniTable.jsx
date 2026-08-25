export default function MiniTable({ columns, rows, onChange, onAddRow, addLabel = '+ Add row' }) {
  return (
    <div>
      <div className="scroll-hidden overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-brand-200 px-2.5 pb-2 text-left text-[11.5px] font-semibold uppercase tracking-wide text-brand-700"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col) => (
                  <td key={col.key} className="border-b border-brand-200 px-1 py-1">
                    <input
                      value={row[col.key] ?? ''}
                      onChange={(e) => onChange(rowIndex, col.key, e.target.value)}
                      className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1.5 font-medium text-brand-900 outline-none hover:bg-brand-100/60 focus:border-brand-500 focus:bg-brand-100/60"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={onAddRow}
        className="mt-3 w-full rounded-lg border border-dashed border-brand-400 py-2 text-[13px] font-semibold text-brand-700 hover:border-accent hover:bg-brand-100/60 hover:text-brand-900"
      >
        {addLabel}
      </button>
    </div>
  )
}
