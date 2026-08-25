import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import apiRoutes from './routes/index.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'

export const app = express()

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  }),
)
app.use(express.json())

app.use('/api', apiRoutes)

app.use(notFoundHandler)
app.use(errorHandler)
