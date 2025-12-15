## Prerequisites

- Node.js `22.x` (CI uses Node 22)
- npm `11.6.2` (see `package.json#packageManager`)

## Setup

1. Install dependencies:

   ```
   npm i
   ```

2. Configure API key for real-time rates:

   - Update `src/environments/environment.ts` and `src/environments/environment.prod.ts`.
   - Set `exchangeRateAPI` to your key from `https://www.exchangerate-api.com/`.

3. Start the dev server:

   ```
   npm start
   ```

   App runs at `http://localhost:4200/`.

## Commands

- `npm start`: run dev server
- `npm run build`: production build (Angular `build.defaultConfiguration` is `production`)
- `npm run watch`: continuous build (`development` configuration)
- `npm test`: unit tests (`@angular/build:unit-test` + `vitest`)
- `npm run build:prod`: production build with `--base-href=/ExchangeRate/` (for subpath hosting)


## Architecture decisions

- Standalone Component: Each component will import necessary library only.  
- Smart vs dumb components:
  - `src/app/UI`: smart components for handling business logic UI
  - `src/shared/components`: Reusable presentational components, purely use for UI display. 
- Layering:
  - `src/app/api`: data-access layer (HTTP + DTO-to-model mapping).
  - `src/app/services`: domain layer - handling business logic.
  - `src/shared/constants`, `src/shared/functions`, `src/shared/types`: shared constants, pure utilities, and type definitions.
- Styling:
  - `src/shared/styles`: SCSS mixins and functions.
  - Follow BEM naming standard but without repeating base class.
- Reactive approach: Angular `signal()`/`computed()` for local state + RxJS for async streams and side-effects.
