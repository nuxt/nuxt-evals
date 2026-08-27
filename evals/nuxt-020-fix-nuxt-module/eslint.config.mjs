// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt().append({
  rules: {
    'vue/multi-word-component-names': 'off'
  }
})
