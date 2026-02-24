export function useCounter(initial = 0) {
  const count = useState('counter', () => initial)

  function increment() {
    count.value++
  }

  function decrement() {
    count.value--
  }

  return { count, increment, decrement }
}
