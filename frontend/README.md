# Sky Watch frontend

React, TypeScript, Vite, Tailwind CSS v4, and shadcn/ui. See the root README for setup, scripts, and the API.

- `src/features/` holds one folder per topic. Data hooks live next to the components that use them.
- `src/components/ui/` is shadcn-generated. Change the theme in `src/index.css`, not in those files.
- `src/types/api.generated.ts` is generated from the backend's OpenAPI schema. Run `npm run gen:api`. Do not edit it by hand.
