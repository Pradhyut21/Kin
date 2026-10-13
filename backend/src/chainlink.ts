/** No CRE workflow or oracle feed has been deployed. Never label example FX as verified data. */
export async function getFxRates(): Promise<never> {
  throw new Error('Chainlink FX integration is not implemented. No verified rate is available.')
}
export async function inrToGbp(_amount: number): Promise<never> { return getFxRates() }
export async function inrToUsd(_amount: number): Promise<never> { return getFxRates() }
