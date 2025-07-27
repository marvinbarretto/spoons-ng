# @fourfold/angular-foundation API Reference

Comprehensive API reference for LLM consumption. Angular 20+ library with standalone components, SSR support, and signal-based reactivity.

## 🎨 Components

### Button (ff-button)
- **Types**: `ButtonSize` ('xs'|'sm'|'md'|'lg'|'xl'), `ButtonType` ('button'|'submit'|'reset')
- **Inputs**: size, type, loading, disabled, loadingText, fullWidth, iconLeft, iconRight, badge, ariaLabel, tooltip, routerLink, queryParams, fragment
- **Outputs**: onClick(MouseEvent)
- **Features**: Router integration, loading states, accessibility, icon support, badge display

### Chip (ff-chip)
- **Types**: `ChipSize` ('xs'|'sm'|'md'|'lg'), `ChipVariant` ('default'|'primary'|'success'|'warning'|'error'|'info')
- **Inputs**: size, variant, clickable, closable, disabled, ariaLabel
- **Outputs**: clicked(), closed()
- **Features**: Content projection, keyboard navigation, close button

### Loading State (ff-loading-state)
- **Purpose**: Universal loading indicator component
- **Features**: Customizable spinners, text display, accessibility

### Empty State (ff-empty-state)
- **Purpose**: Empty data state with action prompts
- **Features**: Icon display, call-to-action buttons, customizable messaging

### Error State (ff-error-state)
- **Purpose**: Error display with retry functionality
- **Features**: Error message display, retry button, icon support

### Tooltip (ff-tooltip)
- **Purpose**: Accessible tooltip component
- **Features**: Position control, hover/focus triggers, SSR safe

## 📡 Data Services

### CacheService
- **Methods**: 
  - `load<T>(options: CacheOptions<T>): Promise<T[]>` - Load with TTL caching
  - `clear(key: string, userId?: string): void` - Clear specific cache
  - `clearUserCaches(userId: string): void` - Clear all user caches
  - `clearAll(): void` - Clear all caches
  - `getCacheInfo(): CacheInfo[]` - Debug cache status
  - `isCached(key: string, ttlMs: number, userId?: string): boolean`
- **Types**: `CACHE_TTL` constants, `CacheOptions<T>`, `CacheEntry<T>`, `CacheInfo`
- **Features**: User-scoped caching, TTL expiration, SSR safe, localStorage backend

### FirestoreService
- **Methods**: CRUD operations for Firestore with offline support
- **Features**: Reactive queries, batch operations, real-time updates

### FirestoreCrudService
- **Methods**: Generic CRUD operations with type safety
- **Features**: Auto-generated IDs, validation, error handling

### StorageService
- **Methods**: Secure local/session storage with encryption
- **Features**: Cross-platform storage, data serialization

### IndexedDbService
- **Methods**: Client-side database operations
- **Features**: Structured data storage, transaction support

## 🌐 Platform Services

### SsrPlatformService
- **Properties**: `isBrowser: boolean`, `isServer: boolean`, `windowWidth: Signal<number|null>`
- **Methods**:
  - `onlyOnBrowser<T>(callback: () => T): T|undefined` - Browser-only execution
  - `getWindow(): Window|undefined` - Safe window access
  - `getDocument(): Document|undefined` - Safe document access
  - `subscribeOnBrowser<T>(sig: Signal<T>, callback: (T) => void): void`
- **Purpose**: SSR-safe platform detection and browser API access

### CameraService
- **Methods**: Camera access and photo capture
- **Features**: Permission handling, multiple camera support

### LocationService
- **Methods**: Geolocation with permission management
- **Features**: Position tracking, error handling

### ViewportService
- **Methods**: Viewport size detection and responsive breakpoints
- **Features**: Signal-based reactivity, breakpoint helpers

### NotificationService
- **Methods**: Browser notification API wrapper
- **Features**: Permission requests, click handling

## 🎯 HTTP & API Services

### BaseHttpService
- **Methods**: Typed HTTP operations with interceptors
- **Features**: Error handling, loading states, retry logic

### AuthInterceptor
- **Purpose**: Automatic token injection for authenticated requests

### ErrorHandlingInterceptor
- **Purpose**: Global error handling and user feedback

### LoadingStateInterceptor
- **Purpose**: Automatic loading state management

### RetryInterceptor
- **Purpose**: Automatic retry for failed requests

## 🔐 Authentication & Security

### AuthGuards
- **Types**: Route protection with role-based access
- **Features**: Async loading, redirect handling

### AuthContracts
- **Types**: Authentication interfaces and types
- **Features**: User models, token management

## 🎨 UI & UX Services

### ToastService
- **Methods**:
  - `success(message: string): void`
  - `error(message: string): void`
  - `info(message: string): void`
  - `warning(message: string): void`
- **Features**: Auto-dismiss, positioning, theming

### OverlayService
- **Methods**: Modal and overlay management
- **Features**: Z-index management, backdrop handling

### ThemeStoreService
- **Methods**: Theme switching and persistence
- **Features**: CSS custom properties, system preference detection

### PaginationService
- **Methods**: Pagination logic and state management
- **Features**: Page size control, navigation helpers

### ListFilterService
- **Methods**: List filtering and search functionality
- **Features**: Multi-field search, sort operations

## 🤖 AI & Text Processing

### LlmService (Gemini)
- **Methods**: AI model integration with Gemini
- **Features**: Streaming responses, context management

### TextParserService
- **Methods**: Text analysis and extraction
- **Features**: Pattern matching, content extraction

### RuleEngineService
- **Methods**: Business rule evaluation
- **Features**: Conditional logic, rule chaining

## 🔧 Development & Debugging

### ErrorLoggingService
- **Methods**: Error capture and reporting
- **Features**: Stack trace analysis, user context

### FeatureFlagsService
- **Methods**: Feature toggle management
- **Features**: A/B testing, gradual rollouts

### FirebaseMetricsService
- **Methods**: Analytics and performance tracking
- **Features**: Custom events, user properties

## 🌐 External Integrations

### TelegramService
- **Methods**: Telegram bot API integration
- **Features**: Message sending, webhook handling

### CookieService
- **Methods**: Secure cookie management
- **Features**: SameSite support, expiration handling

## 🏗️ Architectural Patterns

### BaseComponent
- **Properties**: `loading: Signal<boolean>`, `error: Signal<string|null>`, routing signals
- **Methods**:
  - `handleAsync<T>(operation: () => Promise<T>, options?): Promise<T|null>`
  - `showSuccess/Error/Info/Warning(message: string): void`
  - `navigate(route: string|string[], extras?): Promise<boolean>`
  - `onlyOnBrowser<T>(callback: () => T): T|undefined`
- **Features**: Async operation handling, toast integration, routing helpers, SSR safety

### BaseStore
- **Purpose**: Reactive state management pattern
- **Features**: Signal-based state, async operations

### StoreContracts
- **Types**: Interface definitions for store patterns
- **Features**: Type safety, consistent patterns

## 🔄 Pipes

### RelativeDatePipe
- **Transform**: `(date: string|Date|null) => string`
- **Output**: 'Today', 'Tomorrow', 'Monday', 'Jan 15', etc.
- **Features**: Locale-aware, null-safe, smart relative descriptions

### RelativeDateExtendedPipe
- **Transform**: `(date: string|Date|null, showTime?: boolean) => string`
- **Output**: '5 minutes ago', 'In 2 hours', 'Today at 3:30 PM'
- **Features**: Granular time descriptions, optional time display

### DaysUntilPipe
- **Transform**: `(date: string|Date|null) => number`
- **Output**: Days between current date and target date
- **Features**: Negative values for past dates

## 🛠️ Utilities

### FormValidators
- **Static Methods**:
  - `passwordMatch(field1: string, field2: string): ValidatorFn`
  - `passwordStrength(options?: PasswordStrengthOptions): ValidatorFn`
  - `displayName(options?: DisplayNameOptions): ValidatorFn`
  - `email(options?: EmailOptions): ValidatorFn`
  - `getPasswordStrength(password: string): PasswordStrength`
  - `getErrorMessage(controlName: string, errors: ValidationErrors): string`
- **Types**: `PasswordStrengthOptions`, `DisplayNameOptions`, `EmailOptions`, `PasswordStrength`

### ArrayHelpers
- **Functions**: Array manipulation utilities
- **Features**: Type-safe operations, immutable patterns

### ObjectUrlManager
- **Methods**: File URL lifecycle management
- **Features**: Memory leak prevention, cleanup automation

## 📋 Key Types & Interfaces

### Common Types
- `ButtonSize`, `ButtonType`, `ChipSize`, `ChipVariant`
- `CacheOptions<T>`, `CacheEntry<T>`, `CacheInfo`
- `PasswordStrengthOptions`, `DisplayNameOptions`, `EmailOptions`
- `BaseComponentConfig`, `PasswordStrength`

### Integration Patterns
- All components use `ff-` prefix
- Services use dependency injection with `inject()`
- Signal-based reactivity throughout
- SSR-safe implementations via `SsrPlatformService`
- Consistent error handling and user feedback
- Memory leak prevention with `takeUntilDestroyed()`

## 🚀 Usage Patterns

### Component Development
1. Extend `BaseComponent` for common functionality
2. Use `SsrPlatformService` for browser-specific code
3. Leverage built-in loading/error states
4. Integrate with `ToastService` for user feedback

### Service Integration
1. Use `CacheService` for data caching with TTL
2. Leverage `HttpService` with interceptors for API calls
3. Use `AuthGuards` for route protection
4. Integrate `ErrorLoggingService` for debugging

### State Management
1. Use Angular signals for reactive state
2. Leverage `BaseStore` pattern for complex state
3. Use `handleAsync()` for async operations
4. Implement proper cleanup with `takeUntilDestroyed()`
