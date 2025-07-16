# Spoons Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the Spoons app that ensure data consistency and provide real-time leaderboard functionality.

## 🎯 Purpose

The main issue being solved: **Users had points but 0 pubs/check-ins**, which is impossible. These functions maintain data integrity and keep user statistics synchronized with actual check-in data.

## 📁 Structure

```
functions/
├── src/
│   ├── index.ts              # Main exports
│   ├── models/               # TypeScript models
│   │   ├── user.model.ts     # User data structures
│   │   └── checkin.model.ts  # Check-in data structures
│   ├── utils/                # Utility classes
│   │   ├── userStatsCalculator.ts  # Calculate user stats
│   │   └── checkInValidator.ts     # Validate check-in data
│   ├── triggers/             # Firestore triggers
│   │   ├── onCheckInCreate.ts      # New check-in handler
│   │   └── onUserCreate.ts         # New user handler
│   ├── http/                 # HTTP endpoints
│   │   ├── validateUserStats.ts    # Validation API
│   │   └── getUserLeaderboardStats.ts # Leaderboard API
│   └── scripts/              # Maintenance scripts
│       └── repairUserData.ts       # Data repair utility
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Functions

### Triggers

#### `onCheckInCreate`
- **Trigger**: New document in `checkins` collection
- **Purpose**: Validates check-in and updates user stats immediately
- **Ensures**: User's `totalPoints`, `verifiedPubCount`, etc. stay synchronized

#### `onUserCreate`  
- **Trigger**: New document in `users` collection
- **Purpose**: Initializes user stats to consistent zero values
- **Ensures**: All new users start with proper data structure

### HTTP Endpoints

#### `validateUserStats`
- **Method**: POST
- **Purpose**: Validate/repair user statistics against actual check-ins
- **Usage**: `POST /validateUserStats { "userId": "abc123", "repair": true }`

#### `getUserLeaderboardStats`
- **Method**: GET  
- **Purpose**: Real-time leaderboard data with monthly/all-time stats
- **Usage**: `GET /getUserLeaderboardStats?realUsersOnly=true&period=monthly`

### Scripts

#### `repairUserData`
- **Purpose**: Batch repair of data inconsistencies
- **Features**: Dry-run mode, progress reporting, orphaned data detection
- **Usage**: Called via HTTP endpoint or Firebase Functions shell

## 🚀 Development

### Setup
```bash
cd functions
npm install
```

### Local Development
```bash
# Start emulators
firebase emulators:start

# Build and watch
npm run build:watch

# Test functions locally
firebase functions:shell
```

### Deployment
```bash
# Build functions
npm run build

# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:onCheckInCreate
```

## 🔍 Monitoring

### Logs
```bash
# View all function logs
firebase functions:log

# View specific function logs
firebase functions:log --only onCheckInCreate
```

### Error Tracking
Functions log errors to the `function-errors` collection in Firestore for monitoring and debugging.

## 🧪 Testing

### Validate User Stats
```bash
# Test validation API
curl -X POST https://your-project.cloudfunctions.net/validateUserStats \
  -H "Content-Type: application/json" \
  -d '{"userId": "abc123", "repair": false}'
```

### Repair Data (Dry Run)
```bash
# Test repair process
curl -X POST https://your-project.cloudfunctions.net/repairUserData \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "maxUsers": 10}'
```

### Get Leaderboard Stats
```bash
# Test leaderboard API
curl "https://your-project.cloudfunctions.net/getUserLeaderboardStats?realUsersOnly=true&limit=20"
```

## 🛡️ Data Integrity Checks

The functions perform these validations:

1. **Points Consistency**: Users with points must have check-ins
2. **Pub Count Accuracy**: Verified pub count matches unique pubs in check-ins  
3. **Check-in Validity**: All check-ins reference existing users and pubs
4. **Date Consistency**: Check-in timestamps match date keys
5. **No Duplicates**: One check-in per user/pub/day

## 🚨 Common Issues Fixed

- ✅ Users with points but 0 pubs (impossible scenario)
- ✅ Pub counts not matching actual check-ins
- ✅ Missing user stats after check-ins
- ✅ Stale leaderboard data
- ✅ Orphaned check-ins (missing user/pub references)

## 📊 Performance

- Functions use efficient Firestore queries
- Batch processing for large repair operations
- Caching and pagination for leaderboard API
- Error handling to prevent cascade failures

## 🔐 Security

- Functions run with Firebase Admin privileges
- Input validation on all HTTP endpoints
- Rate limiting and size limits on batch operations
- Comprehensive logging for audit trails

## 🎯 Next Steps

1. **Monitor**: Watch function logs after deployment
2. **Test**: Run validation on existing data
3. **Repair**: Use repair script on inconsistent data  
4. **Integrate**: Update client apps to use new leaderboard API
5. **Optimize**: Add indexes for better query performance