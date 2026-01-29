<template>
  <div>
    <h1>Shopping Cart Demo</h1>
    <p>Welcome to the shopping cart demo. Add items and navigate to see state persistence.</p>

    <div class="products">
      <h2>Products</h2>
      <div class="product-grid">
        <!-- Products will be added here by the AI -->
        <div class="product">
          <h3>Sample Product</h3>
          <p>This is a placeholder. The AI should replace this with actual products and cart functionality.</p>
        </div>
      </div>
    </div>

    <div class="navigation">
      <NuxtLink to="/cart">View Cart</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.product {
  border: 1px solid #ddd;
  padding: 1rem;
  border-radius: 8px;
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
