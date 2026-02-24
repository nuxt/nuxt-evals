const users = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Editor' },
  { id: 3, name: 'Carol Williams', email: 'carol@example.com', role: 'Viewer' },
  { id: 4, name: 'David Brown', email: 'david@example.com', role: 'Editor' },
  { id: 5, name: 'Eva Martinez', email: 'eva@example.com', role: 'Admin' },
]

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  const user = users.find(u => u.id === id)

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  return user
})
