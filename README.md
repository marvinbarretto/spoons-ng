# Spoons

Gamified pub check-in app built with Angular + Firebase



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
- Angular
- Firestore
- Firebase Hosting?
- Docker
- Redis
- Node
- Express
- Jest, Supertest
- Standard-version
- Playwright soon...

## Workflow
`build:ssr` will build the project and start the server
`ng serve` will start the client for HMR development
`npm run test:watch` will run jest in watch mode
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

### Data Layer
- `FirebaseService`: base Firestore access layer (planned)
- `PubsService` (and future `UsersService`, etc.) extends it
- `PubStore`: signal-based state, loads from local JSON in dev, Firestore in prod
- `NearbyPubStore`: computes distances, nearby pubs, and check-in eligibility

### State Management
- Signal stores only (no RxJS)
- Signals use `$$` naming convention
- Computed signals for derived state (e.g. `nearestPubs$$`, `canCheckIn$$`)
- `SsrPlatformService` guards browser/server behavior

### Component Philosophy
- Dumb components bind to signals only
- Debug-first templates to expose raw state for dev
- `DevDebugComponent` for live state visualization

### Build Modes
- `ng serve`: dev mode (uses local JSON only)
- `ng run spoons:serve-ssr`: full SSR
- Dev/prod configs defined in `angular.json`

### TODOs
- Firestore rules
- Map component with custom theming
- Auth & profile system
- Gamification (badges, check-in)
- Jest/Vitest test suite


## Firebase

Seeding
```bash
npx ts-node --project tsconfig.seed.json tools/seed/seed.ts
```


