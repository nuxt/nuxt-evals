export default defineEventHandler(async () => {
  const posts = await $fetch('https://jsonplaceholder.typicode.com/posts')
  return posts
})
