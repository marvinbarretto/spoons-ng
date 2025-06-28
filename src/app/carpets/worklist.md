📋 Work List for Carpet Recognition Integration
1. Create IndexedDB Utility Service 🆕
typescript// src/app/shared/data-access/indexed-db.service.ts

Generic service for IndexedDB operations
Methods: put(), get(), delete(), getAll(), clear()
Handle database versioning and migrations
Error handling and logging
Type-safe with generics

2. Refactor DeviceCarpetStorageService 🔄

Switch from localStorage to IndexedDB
Add image format detection (AVIF → WebP → JPEG)
Update capture methods to use new IndexedDB service
Maintain same public API for smooth migration

3. Integrate with CheckInStore 🔗

Add carpet detection step after validation passes
Call CarpetCheckinIntegrationService
Pass captured image key to CheckInService
Add extensive console logging for orchestration visibility

4. Update CheckInService 📝

Update createCheckin() to accept optional carpetImageKey
Save the key with the CheckIn document

5. Update CheckIn Model 📊
typescriptexport type CheckIn = {
  // ... existing fields
  carpetImageKey?: string;  // e.g., "moon-under-water-watford_2025-06-20"
};
6. Create Carpet Detection UI Component 🎥

Camera preview during check-in flow
Show detection confidence in real-time
Auto-capture on match
Success feedback

7. Create Homepage Carpet Grid Widget 🏠

Simple grid display of all captured carpets
Inject DeviceCarpetStorageService
Load all images from IndexedDB
Basic responsive grid layout

8. Wire Up Routes 🛣️

Add carpet routes to main app routing
Ensure navigation works from check-in flow

9. Testing & Debugging 🐛

Verify full flow with extensive console logs
Test image capture and storage
Ensure check-in still works with carpet detection
Test homepage widget displays saved images

10. Migration Strategy 🔄

Check if any existing localStorage carpet data exists
One-time migration to IndexedDB if needed
Clean up old localStorage entries

📦 Deliverables Priority Order

IndexedDB Service (foundation)
DeviceCarpetStorageService refactor
CheckInStore integration
CheckIn model update
Homepage widget (verify it works)
UI components (polish later)
