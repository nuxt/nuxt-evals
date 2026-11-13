export default defineEventHandler((event) => {
  requireToken(event)
  return [
    { id: 1042, total: 129 },
    { id: 1043, total: 54 },
    { id: 1044, total: 310 }
  ]
})
