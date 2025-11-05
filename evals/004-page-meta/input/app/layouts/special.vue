<template>
  <div class="special-layout">
    <header class="special-header">
      <h1>Special Layout</h1>
      <p>This is a custom layout for special pages</p>
    </header>

    <main class="special-content">
      <slot />
    </main>

    <footer class="special-footer">
      <p>&copy; 2024 - Special Layout Footer</p>
    </footer>
  </div>
</template>

<style scoped>
.special-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.special-header {
  background: rgba(0, 0, 0, 0.1);
  padding: 1rem;
  text-align: center;
}

.special-content {
  flex: 1;
  padding: 2rem;
  background: white;
  color: black;
  margin: 1rem;
  border-radius: 8px;
}

.special-footer {
  background: rgba(0, 0, 0, 0.1);
  padding: 1rem;
  text-align: center;
}
</style>
