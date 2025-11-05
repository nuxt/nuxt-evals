# Nuxt UI Installation

This test evaluates the ability to properly install and configure Nuxt UI in a Nuxt application.

## What it tests

- Installing the `@nuxt/ui` package
- Creating a CSS file with Tailwind CSS and Nuxt UI imports
- Configuring the Nuxt UI module in `nuxt.config.ts`
- Importing the CSS file in the Nuxt config
- Wrapping the app with the `UApp` component
- Following Nuxt UI installation best practices

## Expected behavior

The agent should:
1. Install `@nuxt/ui` package
2. Create `app/assets/css/main.css` (or similar path) with:
   - `@import "tailwindcss";`
   - `@import "@nuxt/ui";`
3. Add `@nuxt/ui` to the modules array in `nuxt.config.ts`
4. Add the CSS file path to the `css` array in `nuxt.config.ts`
5. Update `app.vue` to wrap content with `<UApp>` component

## Key concepts tested

- Nuxt UI installation process
- CSS configuration in Nuxt
- Module registration
- Component wrapper requirements
