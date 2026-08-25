// Vercel serverless entry point. app.js already exports the configured
// Express app without calling listen() (that only happens in src/index.js,
// used for local dev / non-Vercel hosting) — so this file just re-exports it
// for Vercel's Node.js runtime to wrap as a function. See vercel.json for the
// catch-all rewrite that routes every request here.
export { app as default } from '../src/app.js'
