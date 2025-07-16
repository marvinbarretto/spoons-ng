# Splash Screen Logic

## Overview
The splash screen should only be shown ONCE per user session/device to introduce new users to the app. After they've seen it once, they should not be redirected back to it.

## Logic Flow

### Session Start Check
```
1. User opens app
2. Check: Has user seen splash before?
   - Check localStorage for 'hasSeenSplash' flag
   - If YES: Skip splash, proceed with normal auth flow
   - If NO: Show splash screen
```

### User Actions from Splash
```
User clicks "Login" → Navigate to /login
User clicks "Register" → Navigate to /register  
User clicks "Continue as Guest" → Create anonymous user, mark splash as seen, navigate to /home
```

### Post-Splash Behavior
```
Once user has seen splash (any action taken):
- Set 'hasSeenSplash' = true in localStorage
- Never redirect to splash again for this device/browser
- Normal auth flow takes over:
  - No user → /login or /register
  - Anonymous user → allowed to use app (keeps existing username & data)
  - Registered user → allowed to use app
```

## Implementation Requirements

### AuthStore Changes
- Track `hasSeenSplash` state
- Persist to localStorage
- Provide method to mark splash as seen

### Guard Updates
- Check `hasSeenSplash` before redirecting to splash
- Only redirect to splash if user has never seen it
- Default redirect for returning users should be /login

### Splash Component Changes
- Mark splash as seen when any action is taken
- Ensure flag is set before navigation

## User Journey Examples

### First-time User
1. Opens app → Splash screen
2. Clicks "Create Account" → Mark seen, go to /register
3. Later returns → Skip splash, go to /login (if not logged in)

### Returning Guest User
1. Previously clicked "Continue as Guest" → hasSeenSplash = true
2. Returns to app → Skip splash, normal auth flow
3. **Keeps existing anonymous username and all data (points, check-ins, etc.)**
4. Can still access app as guest or choose to register

### Registered User
1. Previously registered → hasSeenSplash = true
2. Returns to app → Skip splash, normal auth flow
3. Auto-login if session valid, otherwise /login

## Anonymous User Persistence
- Firebase Auth automatically persists anonymous sessions in browser storage
- Anonymous users keep their randomly generated username (e.g., "Tipsy Badger")
- All user data (points, badges, check-ins, leaderboard position) is preserved
- Anonymous session persists until user logs out, clears browser data, or upgrades account