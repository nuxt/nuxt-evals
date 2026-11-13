export default defineEventHandler(async (event) => {
  requireToken(event)
  const body = await readBody<{ name?: string }>(event)
  if (!body?.name) {
    throw createError({ statusCode: 400, statusMessage: 'Name is required' })
  }
  return { name: body.name }
})
