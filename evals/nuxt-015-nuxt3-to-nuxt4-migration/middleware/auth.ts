export default defineNuxtRouteMiddleware((to) => {
  const isAuthenticated = false

  if (!isAuthenticated && to.path !== '/') {
    return navigateTo('/')
  }
})
