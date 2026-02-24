<script setup lang="ts">
const email = ref('')
const password = ref('')
const errors = ref<{ email?: string; password?: string }>({})
const submitted = ref(false)

function validate() {
  errors.value = {}

  if (!email.value) {
    errors.value.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errors.value.email = 'Invalid email format'
  }

  if (!password.value) {
    errors.value.password = 'Password is required'
  } else if (password.value.length < 8) {
    errors.value.password = 'Password must be at least 8 characters'
  }

  return Object.keys(errors.value).length === 0
}

function onSubmit() {
  if (validate()) {
    submitted.value = true
    alert('Login successful!')
  }
}
</script>

<template>
  <div class="max-w-md mx-auto mt-16 p-6">
    <h1 class="text-2xl font-bold mb-6">Login</h1>

    <form @submit.prevent="onSubmit">
      <div class="mb-4">
        <label for="email" class="block text-sm font-medium mb-1">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          class="w-full border rounded-lg px-3 py-2"
          placeholder="Enter your email"
        />
        <p v-if="errors.email" class="text-red-500 text-sm mt-1">{{ errors.email }}</p>
      </div>

      <div class="mb-4">
        <label for="password" class="block text-sm font-medium mb-1">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          class="w-full border rounded-lg px-3 py-2"
          placeholder="Enter your password"
        />
        <p v-if="errors.password" class="text-red-500 text-sm mt-1">{{ errors.password }}</p>
      </div>

      <button type="submit" class="w-full bg-black text-white py-2 rounded-lg">
        Sign In
      </button>
    </form>
  </div>
</template>
