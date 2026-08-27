// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    '@nuxt/test-utils/module'
  ],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      beacon: {
        siteId: 'nuxt-evals-demo'
      }
    }
  },
  beacon: {
    sampleRate: 0.25
  }
})
