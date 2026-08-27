export function useTrack() {
  const beacon = useRuntimeConfig().public.beacon as { endpoint: string, siteId?: string }

  return {
    track: (event: string) => $fetch(beacon.endpoint, {
      method: 'POST',
      body: { siteId: beacon.siteId, event }
    })
  }
}
