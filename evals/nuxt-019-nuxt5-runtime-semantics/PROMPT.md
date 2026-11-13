This dashboard opts into Nuxt 5 behavior, and two things need attention:

- The stats panel no longer holds its space while it loads, so the page jumps once it appears.
- The analytics module pre-bundles a dependency for the browser build only, but it registers that Vite tweak in a way Nuxt 5 will not run. It still works today. Move it to the Nuxt 5 way without changing what it does.

Fix both, and stay on Nuxt 5 behavior: don't switch any of it back off. Keep the same behavior, markup, and page structure.
