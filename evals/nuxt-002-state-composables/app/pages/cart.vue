<template>
  <div>
    <h1>Shopping Cart</h1>
    <p>This page should display cart items using the useCart() composable.</p>

    <div class="cart-placeholder">
      <p>Cart functionality should be implemented by the AI using useState</p>
      <p>Expected features:</p>
      <ul>
        <li>Display cart items</li>
        <li>Remove items from cart</li>
        <li>Clear entire cart</li>
        <li>Show total count and price</li>
      </ul>
    </div>

    <div class="navigation">
      <NuxtLink to="/">Back to Products</NuxtLink>
      <NuxtLink to="/checkout">Checkout</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.cart-placeholder {
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
  margin-right: 1rem;
}
</style>
