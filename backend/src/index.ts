import 'dotenv/config'
import { buildApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const server = await buildApp({ config, logger: true })
await server.listen({ port: config.port, host: config.host })
