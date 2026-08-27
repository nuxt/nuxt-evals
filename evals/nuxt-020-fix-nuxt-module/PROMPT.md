The local `beacon` module in `modules/` is causing trouble.

Since we wired it up:

- The module's bar chart can't be used anywhere: `<Chart>` resolves to our own dashboard component, and the module's version is silently dropped.
- `GET /api/track` returns the module's payload, so the order details on the homepage come back empty.
- The app's global stylesheet stopped loading.
- The `beacon` block in `nuxt.config.ts` is ignored. The module always uses its built-in defaults.
- `runtimeConfig.public.beacon.siteId` is `undefined` in the browser, even though `nuxt.config.ts` sets it.
- The console warns that the consent module isn't loaded and tracking is disabled, even though it sits right there at `modules/beacon/consent.ts`. Beacon is supposed to load it itself. Keep it as its own module, don't fold it into beacon.

Fix the module and bring it in line with the module author guide. Don't rename, move or delete anything in `app/`, `server/` or `nuxt.config.ts` to work around it. The app is fine, the module isn't.
