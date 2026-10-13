import { z } from 'zod'

const placeholder = /^(?:your[_ -]|replace[_ -]|changeme|sandbox_key|example)/i
function optionalValue(value: string | undefined): string | undefined {
  const text = value?.trim()
  return text && !placeholder.test(text) ? text : undefined
}

const url = z.string().url().refine((text) => {
  const parsed = new URL(text)
  return !parsed.username && !parsed.password &&
    (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)))
}, 'Use HTTPS, or HTTP on localhost only')
const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/).refine((text) => !/^0x0{40}$/i.test(text), 'A deployed, nonzero address is required')
const schema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(3001),
  host: z.enum(['127.0.0.1', '0.0.0.0']).default('127.0.0.1'),
  origin: url.default('http://127.0.0.1:5173'),
  gatewayToken: z.string().min(32).optional(),
  zerionKey: z.string().optional(), nansenKey: z.string().optional(),
  envioUrl: url.optional(), envioAdminSecret: z.string().optional(), streamVaultAddress: address.optional(),
  llmProvider: z.enum(['kimi', 'qwen']).optional(), llmKey: z.string().optional(),
  llmModel: z.string().min(1).max(120).optional(), llmBaseUrl: url.optional(),
})

export type AppConfig = z.infer<typeof schema>
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.safeParse({
    port: optionalValue(env.PORT), host: optionalValue(env.HOST), origin: optionalValue(env.FRONTEND_ORIGIN),
    gatewayToken: optionalValue(env.API_GATEWAY_TOKEN), zerionKey: optionalValue(env.ZERION_API_KEY),
    nansenKey: optionalValue(env.NANSEN_API_KEY), envioUrl: optionalValue(env.ENVIO_GRAPHQL_URL),
    envioAdminSecret: optionalValue(env.ENVIO_ADMIN_SECRET), streamVaultAddress: optionalValue(env.STREAM_VAULT_ADDRESS),
    llmProvider: optionalValue(env.LLM_PROVIDER), llmKey: optionalValue(env.LLM_API_KEY),
    llmModel: optionalValue(env.LLM_MODEL), llmBaseUrl: optionalValue(env.LLM_BASE_URL),
  })
  if (!parsed.success) throw new Error(`Invalid backend configuration: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`)
  const config = parsed.data
  if (config.llmBaseUrl) {
    const allowed = config.llmProvider === 'kimi'
      ? ['https://api.moonshot.ai/v1', 'https://api.moonshot.cn/v1']
      : ['https://dashscope-intl.aliyuncs.com/compatible-mode/v1', 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'https://dashscope-us.aliyuncs.com/compatible-mode/v1']
    if (!config.llmProvider || !allowed.includes(config.llmBaseUrl.replace(/\/$/, ''))) {
      throw new Error('Invalid backend configuration: llmBaseUrl does not match the selected provider')
    }
  }
  return config
}
export function llmConfigured(config: AppConfig): boolean {
  return Boolean(config.gatewayToken && config.llmProvider && config.llmKey && config.llmModel && config.llmBaseUrl)
}

