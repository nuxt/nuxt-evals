<template>
  <div>
    <h1>Checkout</h1>
    <p>This page should also access the cart state to show order summary.</p>

    <div class="checkout-placeholder">
      <p>The AI should implement checkout functionality that:</p>
      <ul>
        <li>Shows cart summary</li>
        <li>Demonstrates state persistence across pages</li>
        <li>Allows completing the order (clear cart)</li>
      </ul>
    </div>

    <div class="navigation">
      <NuxtLink to="/cart">Back to Cart</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.checkout-placeholder {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.navigation {
  margin-top: 2rem;
}

.navigation a {
  background: #007bff;
  color: white;
  padding: 0.5rem 1rem;
  text-decoration: none;
  border-radius: 4px;
}
</style>
