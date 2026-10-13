/** Documented read-only gateway: https://developers.zerion.io/authentication */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AddressSchema, authorize, fetchJson, invalid, unavailable, upstreamFailed, type RouteOptions } from './shared.js'

const PortfolioSchema = z.object({ data: z.object({ id: z.string(), attributes: z.object({ total: z.object({ positions: z.number().finite() }) }) }) })
const TransactionsSchema = z.object({ data: z.array(z.object({
  id: z.string(), attributes: z.object({ operation_type: z.string(), status: z.string(), mined_at: z.string().nullable().optional() }).passthrough(),
})).max(100) })
const labels: Record<string, string> = { send: 'Sent', receive: 'Received', trade: 'Converted', approve: 'Authorised', execute: 'Executed', deploy: 'Deployed' }

export async function zerionRoutes(server: FastifyInstance, { config, fetcher }: RouteOptions) {
  for (const kind of ['portfolio', 'transactions'] as const) {
    server.get(`/${kind}/:address`, async (request, reply) => {
      const params = z.object({ address: AddressSchema }).strict().safeParse(request.params)
      if (!params.success) return invalid(reply)
      if (!config.zerionKey || !config.gatewayToken) return unavailable(reply, 'Zerion')
      if (!authorize(request, reply, config.gatewayToken)) return
      try {
        const suffix = kind === 'transactions' ? '/?currency=inr&page%5Bsize%5D=20' : '?currency=inr'
        const raw = await fetchJson(fetcher, `https://api.zerion.io/v1/wallets/${params.data.address}/${kind}${suffix}`, {
          headers: { Authorization: `Basic ${Buffer.from(`${config.zerionKey}:`).toString('base64')}`, Accept: 'application/json' },
        })
        if (kind === 'portfolio') {
          const result = PortfolioSchema.parse(raw)
          return reply.send({ status: 'live', source: 'zerion', currency: 'INR', data: result.data })
        }
        const result = TransactionsSchema.parse(raw)
        return reply.send({ status: 'live', source: 'zerion', currency: 'INR', data: result.data.map((item) => ({
          id: item.id, label: labels[item.attributes.operation_type] ?? item.attributes.operation_type,
          // Preserve provider failures, pending, and unknown states; do not promote them to success.
          status: item.attributes.status, timestamp: item.attributes.mined_at ?? null,
          transfers: Array.isArray(item.attributes.transfers) ? item.attributes.transfers : [], rawOp: item.attributes.operation_type,
        })) })
      } catch { return upstreamFailed(reply, 'Zerion') }
    })
  }
}
