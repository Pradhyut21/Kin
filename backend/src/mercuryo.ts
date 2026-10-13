/** Funding requires a verified network integration, signed sessions, and authenticated status/webhooks. */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AddressSchema, invalid } from './shared.js'
const RequestSchema = z.object({ walletAddress: AddressSchema, amountInr: z.number().finite().positive().max(600000), returnUrl: z.string().url().optional() }).strict()
function disabled() { return { status: 'not_implemented', code: 'FUNDING_NOT_IMPLEMENTED', error: 'Live funding is not implemented. No funding session or completed payment can be verified.' } }
export async function mercuryoRoutes(server: FastifyInstance) {
  server.post('/session', async (request, reply) => {
    if (!RequestSchema.safeParse(request.body).success) return invalid(reply)
    return reply.code(501).send(disabled())
  })
  server.get('/status/:orderId', async (request, reply) => {
    if (!z.object({ orderId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/) }).strict().safeParse(request.params).success) return invalid(reply)
    return reply.code(501).send(disabled())
  })
}
