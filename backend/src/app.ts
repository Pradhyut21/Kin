import Fastify, { LogController, type FastifyError } from 'fastify'
import cors from '@fastify/cors'
import { agentRoutes } from './agent.js'
import { zerionRoutes } from './zerion.js'
import { nansenRoutes } from './nansen.js'
import { mercuryoRoutes } from './mercuryo.js'
import { streamRoutes } from './stream.js'
import { loadConfig, llmConfigured, type AppConfig } from './config.js'
import { invalid, type Fetcher } from './shared.js'

export async function buildApp(options: { config?: AppConfig; fetcher?: Fetcher; logger?: boolean } = {}) {
  const config = options.config ?? loadConfig()
  const server = Fastify({ logger: options.logger ?? false, bodyLimit: 8_192, logController: new LogController({ disableRequestLogging: true }) })
  await server.register(cors, { origin: config.origin, methods: ['GET', 'POST'] })
  server.addHook('preValidation', async (request, reply) => {
    if (request.query && Object.keys(request.query).length > 0) return invalid(reply)
  })
  server.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error.statusCode && error.statusCode < 500) return invalid(reply)
    request.log.error({ code: 'API_INTERNAL_ERROR' }, 'API request failed')
    return reply.code(500).send({ status: 'unavailable', code: 'INTERNAL_ERROR', error: 'The request could not be completed.' })
  })
  server.get('/health', async () => ({ status: 'ok', service: 'kin-backend', executionEnabled: false }))
  server.get('/api/integrations', async () => ({
    executionEnabled: false, familyAuthentication: 'not_implemented',
    integrations: {
      zerion: { status: config.zerionKey && config.gatewayToken ? 'configured' : 'not_configured', capability: 'read_only', liveVerified: false },
      nansen: { status: config.nansenKey && config.gatewayToken ? 'configured' : 'not_configured', capability: 'address_labels_only', liveVerified: false },
      envio: { status: config.envioUrl && config.streamVaultAddress && config.gatewayToken ? 'configured' : 'not_configured', capability: 'indexed_snapshot', liveVerified: false },
      llm: { status: llmConfigured(config) ? 'configured' : 'not_configured', capability: 'proposal_only', liveVerified: false },
      mercuryo: { status: 'not_implemented', capability: null, liveVerified: false },
      chainlink: { status: 'not_implemented', capability: null, liveVerified: false },
    },
  }))
  const routeOptions = { config, fetcher: options.fetcher ?? fetch }
  await server.register(zerionRoutes, { ...routeOptions, prefix: '/api/zerion' })
  await server.register(nansenRoutes, { ...routeOptions, prefix: '/api/nansen' })
  await server.register(mercuryoRoutes, { ...routeOptions, prefix: '/api/mercuryo' })
  await server.register(agentRoutes, { ...routeOptions, prefix: '/api/agent' })
  await server.register(streamRoutes, { ...routeOptions, prefix: '/api/stream' })
  return server
}
