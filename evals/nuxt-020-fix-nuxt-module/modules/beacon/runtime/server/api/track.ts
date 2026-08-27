export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null)

  return { received: true, source: 'beacon', siteId: body?.siteId ?? null }
})
