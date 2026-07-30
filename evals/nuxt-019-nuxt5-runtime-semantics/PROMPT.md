This dashboard opts into Nuxt 5 behavior, and two things quietly stopped working:

- The stats panel no longer holds its space while it loads, so the page jumps once it appears.
- The analytics module's Vite tweak stops applying to the browser build. Nothing errors, the dependency just isn't pre-bundled any more.

Fix both, and stay on Nuxt 5 behavior: don't switch any of it back off. Keep the same behavior, markup, and page structure.
