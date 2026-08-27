export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public
  const beacon = config.beacon as { endpoint: string, sampleRate: number, siteId?: string }
  const consent = config.beaconConsent as { defaultState: 'granted' | 'denied' | 'pending' } | undefined

  if (!consent) {
    console.warn('[beacon] consent module not loaded, tracking disabled')
    return
  }

  if (import.meta.client && consent.defaultState === 'granted' && Math.random() < beacon.sampleRate) {
    navigator.sendBeacon?.(beacon.endpoint, JSON.stringify({ siteId: beacon.siteId, path: location.pathname }))
  }
})
