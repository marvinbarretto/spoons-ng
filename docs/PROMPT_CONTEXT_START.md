Context: We're building [feature] for Angular app with signals + Firebase

Architecture:
- Angular 19 with signals (no RxJS unless necessary)
- Firebase (Firestore, Auth) with anonymous users supported
- Client-side PWA, Jest for testing
- Following Spoons architecture patterns (see project knowledge)

Discovery Phase:
- Search existing services/stores for: [domain/feature keywords]
- Inventory what's available vs. what needs building
- Identify real dependencies (don't assume)

Implementation Approach:
- Console-log driven development (heavy logging at each step)
- Start with absolute minimum viable code
- Add ONE real piece at a time (replace simulations gradually)
- Copy/paste console output frequently for debugging
- Question complexity early - split if it feels hard

Validation Strategy:
- Test with real data (like actual pub distances, real user scenarios)
- Validate each step before proceeding
- Unit tests AFTER we understand behavior (not before)
- Jest tests covering real-world scenarios + edge cases

Code Quality:
- Single responsibility per method/store
- Clear error messages and graceful failures
- Proper TypeScript types
- JSDoc for complex logic
- Follow existing naming conventions

Current task: [specific feature/bug/improvement]

Success criteria: [what "done" looks like]

Constraints: [any technical limitations or requirements]
