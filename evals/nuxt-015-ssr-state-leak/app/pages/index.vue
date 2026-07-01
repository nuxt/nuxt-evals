<script setup lang="ts">
const { profile, setProfile } = useProfile()

function signIn() {
  setProfile('Ada Lovelace', 'ada@example.com')
}
</script>

<template>
  <div>
    <h1>Home</h1>
    <p>Signed in as: {{ profile.name }}</p>
    <button @click="signIn">Sign in</button>
    <NuxtLink to="/account">Go to account</NuxtLink>
  </div>
</template>
