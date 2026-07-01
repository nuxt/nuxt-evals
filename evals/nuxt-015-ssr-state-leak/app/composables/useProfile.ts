import { reactive } from 'vue'

// Shared profile for the signed-in user, reused across every page.
export const profile = reactive({
  name: 'Guest',
  email: '',
})

export function useProfile() {
  function setProfile(name: string, email: string) {
    profile.name = name
    profile.email = email
  }

  return { profile, setProfile }
}
