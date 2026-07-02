export default defineEventHandler((event) => {
  const { currency } = getQuery(event)

  // isSupportedCurrency is auto-imported from server/utils/currency.ts
  if (typeof currency !== 'string' || !isSupportedCurrency(currency)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported currency' })
  }

  return { currency, rate: 1 }
})
