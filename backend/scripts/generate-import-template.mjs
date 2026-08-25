// Refreshes the downloadable import template (frontend/public/) from the
// versioned master copy in backend/assets/ — run this after replacing the
// master file (e.g. a newer copy of the DOLE "Database" sheet template).
// The template is no longer generated from a column list; it's shipped
// verbatim (headers, formatting, and the Codes-sheet-backed dropdown
// validations all come from the real workbook) — see
// backend/src/lib/databaseFormat.js and import.routes.js's COL map, which
// must be kept in sync with this file's column layout if it ever changes.
// Run: node scripts/generate-import-template.mjs
import { copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOURCE_PATH = path.join(__dirname, '..', 'assets', 'child-profile-import-template-master.xlsx')
const OUT_PATH = path.join(__dirname, '..', '..', 'frontend', 'public', 'child-profile-import-template.xlsx')

await copyFile(SOURCE_PATH, OUT_PATH)
console.log(`Copied ${SOURCE_PATH} -> ${OUT_PATH}`)
