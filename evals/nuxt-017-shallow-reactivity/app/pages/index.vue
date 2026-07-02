<script setup lang="ts">
interface Todo { id: number; title: string; done: boolean }

const { data: todos } = await useFetch<Todo[]>('/api/todos')

function toggle(todo: Todo) {
  todo.done = !todo.done
}
</script>

<template>
  <ul>
    <li v-for="todo in todos" :key="todo.id">
      <label>
        <input type="checkbox" :checked="todo.done" @change="toggle(todo)">
        {{ todo.title }}
      </label>
    </li>
  </ul>
</template>
