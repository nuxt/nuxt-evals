import { defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'beacon-consent',
    configKey: 'beaconConsent'
  },
  setup(_options, nuxt) {
    nuxt.options.runtimeConfig.public.beaconConsent ||= { defaultState: 'pending' }
  }
})
