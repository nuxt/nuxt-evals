<script setup lang="ts">
interface Product {
  name: string
  price: number
  inStock: boolean
}

const products = ref<Product[]>([
  { name: 'Laptop', price: 999, inStock: true },
  { name: 'Phone', price: 699, inStock: true },
  { name: 'Tablet', price: 499, inStock: false },
  { name: 'Watch', price: 299, inStock: true },
  { name: 'Headphones', price: 199, inStock: false },
])

const totalProducts = ref(0)
const inStockCount = ref(0)
const averagePrice = ref('0.00')

watch(products, (newProducts) => {
  totalProducts.value = newProducts.length
}, { immediate: true, deep: true })

watch(products, (newProducts) => {
  inStockCount.value = newProducts.filter(p => p.inStock).length
}, { immediate: true, deep: true })

watch(products, (newProducts) => {
  const total = newProducts.reduce((sum, p) => sum + p.price, 0)
  averagePrice.value = (total / newProducts.length).toFixed(2)
}, { immediate: true, deep: true })

function removeProduct(index: number) {
  products.value.splice(index, 1)
}
</script>

<template>
  <div>
    <h1>Product Inventory</h1>

    <div>
      <p>Total products: {{ totalProducts }}</p>
      <p>In stock: {{ inStockCount }}</p>
      <p>Average price: ${{ averagePrice }}</p>
    </div>

    <ul>
      <li v-for="(product, index) in products" :key="product.name">
        {{ product.name }} - ${{ product.price }}
        <span v-if="!product.inStock"> (Out of stock)</span>
        <button @click="removeProduct(index)">Remove</button>
      </li>
    </ul>
  </div>
</template>
