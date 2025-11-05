# Nuxt State Management with Composables

This evaluation tests the implementation of reusable composables using Nuxt's `useState` for global state management.

## Challenge

Create a shopping cart functionality that demonstrates proper state management across multiple pages using Nuxt composables.

## Requirements

### 1. **Create useShoppingCart() Composable**
- Use `useState` to create reactive global state
- Implement the following methods:
  - `addItem(item)` - Add product to cart
  - `removeItem(itemId)` - Remove item from cart
  - `clearCart()` - Empty the entire cart
  - `getCartTotal()` - Calculate total price
  - `getCartCount()` - Get total number of items

### 2. **State Structure**
```typescript
interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface CartState {
  items: CartItem[]
}
```

### 3. **Page Implementation**
- **Homepage** (`/`): Display products with "Add to Cart" buttons
- **Cart Page** (`/cart`): Show cart items with remove functionality
- **Checkout Page** (`/checkout`): Display order summary and complete order

### 4. **State Persistence Requirements**
- State must persist across page navigation
- State must survive component unmounting/remounting
- Cart should remain consistent across all pages
- Demonstrate reactive updates when state changes

## Expected Behavior

1. User can add items from the homepage
2. Cart state is immediately reflected in navigation to cart page
3. Removing items updates state globally
4. Cart count/total updates reactively across all components
5. State persists during client-side navigation

## Key Nuxt Concepts Tested

- `useState()` for global state management
- Composables creation and reusability
- Reactivity across components
- SSR-safe state management
- State persistence in SPA mode

## Success Criteria

- ✅ Shopping cart composable works correctly
- ✅ State persists across page navigation
- ✅ All CRUD operations function properly
- ✅ Reactive updates work across all pages
- ✅ No hydration mismatches
- ✅ TypeScript support implemented
- ✅ Tests pass successfully
