export default defineNuxtPlugin(() => {
  const token = useCookie('token')

  globalThis.$fetch = $fetch.create({
    onRequest({ request, options }) {
      if (token.value && String(request).startsWith('/api')) {
        options.headers.set('Authorization', `Bearer ${token.value}`)
      }
    }
  }) as typeof globalThis.$fetch
})
