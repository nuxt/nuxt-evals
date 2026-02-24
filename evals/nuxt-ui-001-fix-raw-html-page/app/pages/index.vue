<template>
  <div>
    <header class="flex items-center justify-between p-4 border-b">
      <div class="text-xl font-bold">MyApp</div>
      <nav class="flex gap-4">
        <a href="/" class="hover:underline">Home</a>
        <a href="/about" class="hover:underline">About</a>
        <a href="/contact" class="hover:underline">Contact</a>
      </nav>
    </header>

    <main class="p-8">
      <section class="text-center py-16">
        <h1 class="text-4xl font-bold mb-4">Build something amazing</h1>
        <p class="text-lg text-gray-500 mb-8">The fastest way to build your next project with Nuxt.</p>
        <div class="flex gap-4 justify-center">
          <a href="/get-started" class="bg-black text-white px-6 py-2 rounded-lg">Get Started</a>
          <a href="https://github.com" class="border px-6 py-2 rounded-lg">GitHub</a>
        </div>
      </section>

      <section class="py-16">
        <h2 class="text-2xl font-bold text-center mb-8">Features</h2>
        <div class="grid grid-cols-3 gap-8">
          <div class="p-4 border rounded-lg">
            <h3 class="font-bold">Fast</h3>
            <p>Optimized for speed and performance.</p>
          </div>
          <div class="p-4 border rounded-lg">
            <h3 class="font-bold">Secure</h3>
            <p>Built-in security best practices.</p>
          </div>
          <div class="p-4 border rounded-lg">
            <h3 class="font-bold">Scalable</h3>
            <p>Grows with your application needs.</p>
          </div>
        </div>
      </section>
    </main>

    <footer class="p-4 border-t text-center text-gray-500">
      <p>&copy; 2025 MyApp. All rights reserved.</p>
    </footer>
  </div>
</template>
