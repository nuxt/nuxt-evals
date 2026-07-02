export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'] as const

export function isSupportedCurrency(code: string): boolean {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code)
}
