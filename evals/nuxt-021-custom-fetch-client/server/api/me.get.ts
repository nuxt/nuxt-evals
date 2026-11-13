export default defineEventHandler((event) => {
  const token = requireToken(event)
  return { id: 'u_1', name: 'Ada Lovelace', token: token.slice(0, 4) }
})
