export default defineEventHandler(() => {
  // Order tracking for the storefront, nothing to do with analytics.
  return { orderId: 'ORD-1042', status: 'in-transit', carrier: 'DHL' }
})
