import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import YAML from 'yaml'

const config = YAML.parse(readFileSync(new URL('../config.yaml', import.meta.url), 'utf8'))
const schema = JSON.parse(readFileSync(new URL('../node_modules/envio/evm.schema.json', import.meta.url), 'utf8'))
const validate = new Ajv2020({ strict: false, validateFormats: false, allErrors: true }).compile(schema)
assert.ok(validate(config), JSON.stringify(validate.errors))

// Every declared signature must match the source contract, including indexed fields.
for (const contract of config.contracts) {
  const source = readFileSync(new URL(`../../contracts/src/${contract.name}.sol`, import.meta.url), 'utf8')
  for (const { event } of contract.events) assert.ok(source.includes(`event ${event};`), `ABI signature mismatch: ${contract.name}.${event}`)
}
for (const chain of config.chains) {
  for (const contract of chain.contracts) {
    const addresses = Array.isArray(contract.address) ? contract.address : [contract.address]
    if (!chain.skip) assert.equal(addresses.length, 1, `Exactly one deployed ${contract.name} is required before enabling indexing`)
    for (const address of addresses) assert.ok(/^0x[a-fA-F0-9]{40}$/.test(address) && !/^0x0{40}$/i.test(address), 'A real nonzero deployment address is required')
  }
}
console.log('Envio schema and contract event signatures valid. Indexer chain is disabled until deployment.')
