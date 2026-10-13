/** POST address-label API: https://docs.nansen.ai/api/profiler/address-labels */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AddressSchema, authorize, fetchJson, invalid, unavailable, upstreamFailed, type RouteOptions } from './shared.js'
const ResponseSchema = z.object({ data: z.array(z.object({ label: z.string().max(300), category: z.string().max(100) })).max(100) })

export async function nansenRoutes(server: FastifyInstance, { config, fetcher }: RouteOptions) {
  server.get('/risk/:address', async (request, reply) => {
    const params = z.object({ address: AddressSchema }).strict().safeParse(request.params)
    if (!params.success) return invalid(reply)
    if (!config.nansenKey || !config.gatewayToken) return unavailable(reply, 'Nansen')
    if (!authorize(request, reply, config.gatewayToken)) return
    try {
      const data = ResponseSchema.parse(await fetchJson(fetcher, 'https://api.nansen.ai/api/v1/profiler/address/labels', {
        method: 'POST', headers: { apiKey: config.nansenKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: params.data.address, chain: 'monad', pagination: { page: 1, per_page: 100 } }),
      }))
      return reply.send({
        status: 'live', source: 'nansen', address: params.data.address, chain: 'monad', labels: data.data,
        riskLevel: 'unknown', verifiedRecipient: false, paymentApproved: false,
        reason: 'Address labels provide context only. They do not establish recipient identity, safety, or payment approval.',
      })
    } catch { return upstreamFailed(reply, 'Nansen') }
  })
}
