import type { H3Event } from 'h3'

// The API is shared with the mobile app, which has no cookies, so it only
// accepts a bearer token in the Authorization header.
export function requireToken(event: H3Event): string {
  const header = getRequestHeader(event, 'authorization')
  if (!header?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Missing bearer token' })
  }
  return header.slice('Bearer '.length)
}
