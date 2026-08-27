import { addComponent, addImports, addPlugin, addServerHandler, defineNuxtModule } from '@nuxt/kit'

export interface ModuleOptions {
  endpoint: string
  sampleRate: number
}

export default defineNuxtModule<ModuleOptions>({
  defaults: {
    endpoint: '/api/track',
    sampleRate: 1
  },
  setup(options, nuxt) {
    nuxt.options.runtimeConfig.public.beacon = {
      endpoint: options.endpoint,
      sampleRate: options.sampleRate
    }

    nuxt.options.css = ['~~/modules/beacon/runtime/assets/beacon.css']

    addPlugin('~~/modules/beacon/runtime/plugin')

    addComponent({
      name: 'Chart',
      filePath: '~~/modules/beacon/runtime/components/Chart.vue'
    })

    addImports({
      name: 'useTrack',
      as: 'useTrack',
      from: '~~/modules/beacon/runtime/composables/useTrack'
    })

    addServerHandler({
      route: '/api/track',
      handler: '~~/modules/beacon/runtime/server/api/track'
    })
  }
})
