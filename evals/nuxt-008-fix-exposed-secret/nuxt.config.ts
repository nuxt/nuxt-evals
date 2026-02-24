// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    '@nuxt/test-utils/module'
  ],
  runtimeConfig: {
    apiSecret: 'sk_secret_123',
    public: {
      appName: 'My App'
    }
  }
})
