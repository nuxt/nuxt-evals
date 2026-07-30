import { addVitePlugin, defineNuxtModule } from 'nuxt/kit'

export default defineNuxtModule({
  meta: { name: 'analytics-optimize' },
  setup() {
    // Pre-bundle the router for the browser build only.
    addVitePlugin(() => ({
      name: 'analytics-optimize',
      config(config) {
        config.optimizeDeps ||= {}
        config.optimizeDeps.include ||= []
        config.optimizeDeps.include.push('vue-router')
      }
    }), { server: false })
  }
})
