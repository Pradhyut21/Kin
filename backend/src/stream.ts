/** Read-only indexed snapshots. Amounts remain decimal strings in token atomic units. */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AddressSchema, authorize, fetchJson, invalid, unavailable, upstreamFailed, type RouteOptions } from './shared.js'
const UInt = z.string().regex(/^(?:0|[1-9]\d{0,77})$/)
const StreamSchema = z.object({
  id: z.string(), streamId: UInt, parent: AddressSchema, student: AddressSchema, token: AddressSchema,
  ratePerSecond: UInt, depositedBalance: UInt, accruedBalance: UInt, startTime: UInt, lastWithdrawn: UInt,
  active: z.boolean(), lastEventTimestamp: UInt, lastEventBlock: UInt,
}).refine((s) => BigInt(s.ratePerSecond) > 0n && BigInt(s.accruedBalance) <= BigInt(s.depositedBalance))
const ResponseSchema = z.object({ data: z.object({ Stream: z.array(StreamSchema).max(1) }), errors: z.unknown().optional() }).refine((value) => value.errors === undefined)
const query = `query GetStream($student: String!, $vault: String!) {
  Stream(where: { student: { _eq: $student }, vault: { _eq: $vault } }, order_by: { createdAt: desc }, limit: 1) {
    id streamId parent student token ratePerSecond depositedBalance accruedBalance startTime lastWithdrawn active lastEventTimestamp lastEventBlock
  }
}`

export async function streamRoutes(server: FastifyInstance, { config, fetcher }: RouteOptions) {
  for (const live of [false, true]) {
    server.get(`/:studentAddress${live ? '/live' : ''}`, async (request, reply) => {
      const params = z.object({ studentAddress: AddressSchema }).strict().safeParse(request.params)
      if (!params.success) return invalid(reply)
      if (!config.envioUrl || !config.streamVaultAddress || !config.gatewayToken) return unavailable(reply, 'Envio')
      if (!authorize(request, reply, config.gatewayToken)) return
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (config.envioAdminSecret) headers['x-hasura-admin-secret'] = config.envioAdminSecret
        const result = ResponseSchema.parse(await fetchJson(fetcher, config.envioUrl, {
          method: 'POST', headers, body: JSON.stringify({ query, variables: { student: params.data.studentAddress, vault: config.streamVaultAddress.toLowerCase() } }),
        }))
        const stream = result.data.Stream[0]
        if (!stream) return reply.code(404).send({ status: 'not_found', code: 'STREAM_NOT_FOUND', stream: null })
        if (stream.student !== params.data.studentAddress) return upstreamFailed(reply, 'Envio')
        if (!live) return reply.send({ status: 'indexed_snapshot', source: 'envio', stream, currentBlockVerified: false })
        // Only show entitlement at the last indexed event. Wall time is not evidence of latest chain state.
        return reply.send({ status: 'indexed_snapshot', source: 'envio', streamId: stream.streamId,
          accruedAmountAtomic: stream.accruedBalance, ratePerSecondAtomic: stream.ratePerSecond,
          depositedBalanceAtomic: stream.depositedBalance, token: stream.token, active: stream.active,
          timestamp: stream.lastEventTimestamp, block: stream.lastEventBlock,
          currentBlockVerified: false, fiatConversion: null,
        })
      } catch { return upstreamFailed(reply, 'Envio') }
    })
  }
}
