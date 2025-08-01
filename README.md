# Spoons

Gamified pub check-in app built with Angular + Firebase



## Important files
 - `points.config.ts` - tweak this to know how to do this right
 


## Development
## Test on the phone
`ng serve --host 0.0.0.0`
`ifconfig | grep inet` // get the ip address
`{ip address}:4200/` // open this in the phone


## Troubleshooting
### Firebase
- Useful commands
  - `firebase projects:list`

- Auth issues
  - `firebase logout` 
  - `rm -rf ~/.config/configstore/firebase-tools.json`
  - `firebase login`

- Permission issues
  - `FirebaseError: Missing or insufficient permissions`
    - they could be being blocked in the firestore rules, check the console
    

## Stack
- Angular 20 with Signals
- Firestore
- Firebase Hosting?
- Docker
- Redis
- Node
- Express
- Vitest (Modern Testing)
- Standard-version
- Playwright soon...

## Workflow
`build:ssr` will build the project and start the server
`ng serve` will start the client for HMR development
`npm run test:watch` will run vitest in watch mode
`release` will run standard-version and set the tags
`gpt` will push it up


## Local aliases
```bash
alias release="npm run release"
alias gs="git status"
alias gcm="git commit -m"
alias gp="git pull"
alias gpt="git push && git push --tags"
```

## Docker commands:
### Check and remove containers
```bash
docker ps -q | xargs docker stop
docker ps -q | xargs docker rm
```

### Remove all containers
```bash
docker container prune
```

### Run on port 4040 locally
```bash
docker build -t spoons .
docker run -p 4040:4000 spoons
```

### Redis
stale-while-revalidate pattern

`redis-cli MONITOR` to monitor redis

Flush redis cache
```bash
redis-cli DEL newsData
```
newsData
newsLastFetchDate
events:v1



## 🧠 Architecture Overview

### Tech Stack
- Angular 19 with SSR (Universal)
- Firebase: Firestore (mocked in dev), Auth (planned)
- Express + Redis for SSR API caching
- Fully PWA-enabled (via `ngsw-config.json`)
- Railway deployment (Dockerized client & server)

### Architecture Documentation
- [CLAUDE.md](./CLAUDE.md) - Codebase guidance and conventions
- [PATTERNS.md](./PATTERNS.md) - Architectural patterns and best practices

### Data Layer
- `FirebaseService`: base Firestore access layer (planned)
- `PubsService` (and future `UsersService`, etc.) extends it
- `PubStore`: signal-based state, loads from local JSON in dev, Firestore in prod
- `NearbyPubStore`: computes distances, nearby pubs, and check-in eligibility

### State Management
- **Signal stores only** (no RxJS unless required)
- **Clean signal naming** without `$$` suffix (modern Angular 19 approach)
- **Computed signals** for derived state (e.g. `nearestPubs`, `canCheckIn`)
- **Auth-reactive stores** that auto-load/clear based on auth state
- `SsrPlatformService` guards browser/server behavior

### Component Philosophy
- **Dumb components** bind to signals only
- **Debug-first templates** to expose raw state for dev
- **Shared state components** for consistent loading/error/empty states
- `DevDebugComponent` for live state visualization

### UI Components
- **Shared State Components**: Standardized loading, error, and empty state components
  - `LoadingStateComponent` - Configurable spinner with loading text
  - `ErrorStateComponent` - Error display with optional retry functionality
  - `EmptyStateComponent` - Empty state with customizable icon, title, and action button
- **Design token compliance** for theming (dark/light mode support)
- **Accessibility-first** with proper ARIA attributes

### Build Modes
- `ng serve`: dev mode (uses local JSON only)
- `ng run spoons:serve-ssr`: full SSR
- Dev/prod configs defined in `angular.json`

### Recent Improvements
- ✅ **Shared UI State Components** - Eliminated 400+ lines of duplicate loading/error/empty state code
- ✅ **Consistent UX** - Standardized loading states across all components
- ✅ **Accessibility** - All state components include proper ARIA attributes
- ✅ **Design tokens** - Full theme support (dark/light mode compatibility)

## 🧪 Testing Architecture

### Modern Test Suite (2025)

We've migrated from Jest to **Vitest** with a business-value-focused testing philosophy:

**✅ What We Test:**
- **Business Logic**: Core algorithms, calculations, and data processing
- **Service Integration**: Cross-service coordination and workflows  
- **Store Patterns**: BaseStore reactive patterns and auth-reactive behavior
- **Data Consistency**: Points, badges, leaderboard calculations

**❌ What We Don't Test:**
- Angular framework functionality ("should create" tests)
- Simple template bindings and UI display
- Component instantiation without business logic

### Test Commands
```bash
npm test              # Run all tests (fast, parallel)
npm run test:watch    # Watch mode for development  
npm run test:ci       # CI mode (sequential, verbose)
```

### Test Utilities
- **Firebase Mocking**: `@shared/testing/firebase.mocks.ts` 
- **Store Testing**: `@shared/testing/store-test-utils.ts`
- **Foundation Mocks**: `@shared/testing/foundation.mocks.ts`

### Current Test Status
- **11 passing test files** with solid business logic coverage
- **Modern signal-based patterns** with comprehensive mocking
- **Focus on value**: Tests protect real business functionality

See `CLAUDE.md` for detailed testing guidelines and patterns.

### TODOs
- Map component with custom theming
- Auth & profile system refinements
- Gamification enhancements (badges, check-in rewards)
- Additional component refactoring (modal/form components)
- Bundle size optimization


## Firebase

Seeding
```bash
npx ts-node --project tsconfig.seed.json tools/seed/seed.ts
```




`npm run analyze` - to check bundle size

