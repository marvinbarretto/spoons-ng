# Telegram Notification Setup

This guide explains how to set up Telegram notifications for feedback submissions in Spoonscount.

## Prerequisites

1. Create a Telegram bot
2. Get your chat ID
3. Configure environment variables

## Step 1: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the prompts to name your bot
4. Save the bot token provided (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Step 2: Get Your Chat ID

1. Start a chat with your new bot
2. Send any message to the bot
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for the `"chat":{"id":` value in the response

## Step 3: Configure Environment Variables

### Frontend Configuration

Add your Telegram credentials to the environment files:

```typescript
// src/environments/environment.ts
telegram: {
  botToken: 'YOUR_BOT_TOKEN_HERE',
  chatId: 'YOUR_CHAT_ID_HERE'
},
```

### Firebase Functions Configuration (Optional)

For server-side notifications via Firebase Functions:

```bash
firebase functions:config:set telegram.bot_token="YOUR_BOT_TOKEN" telegram.chat_id="YOUR_CHAT_ID"
```

## How It Works

When a user submits feedback:

1. **Frontend Service**: The `TelegramNotificationService` sends a notification immediately after feedback is saved
2. **Firebase Function** (if configured): Sends a backup notification when the feedback document is created in Firestore

## Notification Format

Feedback notifications include:
- Feedback type (bug/suggestion/confusion) with emoji
- User information (name and email)
- Feedback message
- Context (URL, viewport, browser)
- Screenshot availability
- Timestamp

## Testing

1. Submit feedback through the app
2. Check your Telegram chat for the notification
3. Verify all information is displayed correctly

## Troubleshooting

- **No notifications**: Check bot token and chat ID are correct
- **403 Forbidden**: Make sure you've started a chat with your bot
- **Network errors**: Telegram API might be blocked in some networks
- **Firebase functions**: Check logs with `firebase functions:log`

## Security Notes

- Never commit real bot tokens to version control
- Use environment variables for production deployments
- Consider using Firebase Functions for server-side notifications in production