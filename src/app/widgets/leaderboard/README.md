# Leaderboard Widget

A compact leaderboard widget that shows the current user's position with context (2 places above and below).

## Overview

The LeaderboardWidget displays a focused view of the leaderboard centered around the current user's position. It's designed for dashboard integration and provides quick competitive context without overwhelming the interface.

## Features

- **User Context Display**: Shows user's position ±2 spots for competitive context
- **Current User Highlighting**: Visually emphasizes the current user's row
- **Points Formatting**: Smart formatting (1.2k pts for large numbers)
- **Position Change Indicators**: Shows movement with colored arrows (↑↓)
- **Navigation**: Click-through to full leaderboard page
- **Responsive Design**: Mobile-friendly layout
- **Loading/Error States**: Proper state handling for data loading

## Usage

```typescript
// In component imports
import { LeaderboardWidgetComponent } from './widgets/leaderboard/leaderboard-widget.component';

// In template
<app-leaderboard-widget></app-leaderboard-widget>
```

## Data Source

Uses direct `LeaderboardStore` injection for leaderboard-specific data:

- `topByPoints()`: Full ranked user list (primary ranking by points)
- `userRankByPoints()`: Current user's rank position
- `loading()` / `error()`: State management signals

## Architecture Pattern

Follows the **Direct Store Access** pattern for widget-specific concerns:

```typescript
// Direct access for leaderboard-specific functionality
private readonly leaderboardStore = inject(LeaderboardStore);

// No DataAggregatorService needed - LeaderboardStore is self-contained
```

## States

### Loading State
Shows spinner with "Loading rankings..." message.

### Error State
Displays error message with warning icon.

### Empty State (Not Ranked)
Shows encouragement message for users not yet on leaderboard.

### Normal State
Displays 5-user context list with current user highlighted.

## Styling

Uses semantic CSS variables for consistent theming:

- `--background-lighter`: Widget background (subtle differentiation from main app)
- `--accent` / `--accent-contrast`: Current user highlighting
- `--text` / `--text-secondary`: Text hierarchy
- `--border` / `--border-lighter`: Borders and dividers

## Edge Cases

- **Top of Leaderboard**: Shows positions 1-3 when user is #1
- **Bottom of Leaderboard**: Shows last 3 positions when user is at bottom
- **User Not Ranked**: Shows empty state with onboarding message
- **Small Leaderboard**: Adapts to show available users (min 1, max 5)

## Performance

- **Computed Signals**: Reactive data transformation with minimal re-computation
- **Direct Store Access**: No unnecessary aggregation layers
- **Slice Algorithm**: Efficient extraction of user context from full list

## Testing

Comprehensive test coverage includes:

- Component creation and initialization
- Loading/error/empty state rendering
- User context calculation edge cases
- Current user highlighting
- Navigation functionality
- Points formatting
- Mobile responsiveness

## Integration

Currently integrated in:

- **Home Component**: Dashboard widget for competitive overview
- Future: Could be added to profile pages, mission completion screens, etc.

## Future Enhancements

- Time range filtering (this week/month/all-time)
- Position change animation
- Share position functionality
- Different ranking metrics (visits, badges, streaks)