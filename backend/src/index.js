import { app } from './app.js'

const port = process.env.PORT || 4000

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is not set — DB-backed routes will fail until backend/.env is configured.')
  }
})
