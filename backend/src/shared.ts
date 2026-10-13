import { timingSafeEqual } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { AppConfig } from './config.js'

export type Fetcher = typeof fetch
export interface RouteOptions { config: AppConfig; fetcher: Fetcher }
export const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/).refine((value) => !/^0x0{40}$/i.test(value)).transform((value) => value.toLowerCase())
export const StreamIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
export function invalid(reply: FastifyReply) {
  return reply.code(400).send({ status: 'invalid_request', code: 'INVALID_REQUEST', error: 'The request does not match the required schema.' })
}
export function unavailable(reply: FastifyReply, integration: string) {
  return reply.code(503).send({ status: 'not_configured', code: 'INTEGRATION_NOT_CONFIGURED', integration, error: `${integration} is not configured. No live result is available.` })
}
export function upstreamFailed(reply: FastifyReply, integration: string) {
  return reply.code(502).send({ status: 'unavailable', code: 'UPSTREAM_UNAVAILABLE', integration, error: `${integration} did not return a valid live result.` })
}
export function authorize(request: FastifyRequest, reply: FastifyReply, token: string): boolean {
  const expected = Buffer.from(`Bearer ${token}`)
  const actual = Buffer.from(request.headers.authorization ?? '')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    reply.code(401).send({ status: 'unauthorized', code: 'GATEWAY_TOKEN_REQUIRED', error: 'A valid gateway access token is required.' })
    return false
  }
  return true
}
export async function fetchJson(fetcher: Fetcher, url: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15_000) })
  if (response.status !== 200) throw new Error('Provider response unavailable')
  return response.json()
}
