# Telegram MTProto Authentication Setup

## Overview

This app now uses **Telegram MTProto API** (user authentication) instead of Bot API. This means:

✅ **Full chat history access** - Can read all messages in groups/channels
✅ **Cross-device sync** - Files persist across all devices automatically
✅ **No localStorage needed** - Everything comes from Telegram directly
✅ **Real-time updates** - See changes from other devices instantly

## Getting API Credentials

Before you can use the app, you need to get API credentials from Telegram:

### Step 1: Get API_ID and API_HASH

1. Go to [https://my.telegram.org](https://my.telegram.org)
2. Login with your phone number
3. Click on "API development tools"
4. Fill out the form:
   - **App title**: TeleCloud (or any name you like)
   - **Short name**: telecloud
   - **URL**: (leave empty or put your website)
   - **Platform**: Web
   - **Description**: Cloud storage using Telegram
5. Click "Create application"
6. You'll see your **App api_id** and **App api_hash**

### Step 2: Update the Code

Open `src/services/telegram-mtproto.ts` and replace these lines:

```typescript
const API_ID = 29371144; // Replace with YOUR api_id
const API_HASH = 'b1c5e3b87a2e7c9d0f1a2b3c4d5e6f7'; // Replace with YOUR api_hash
```

With your actual credentials:

```typescript
const API_ID = 12345678; // YOUR api_id (number)
const API_HASH = 'your_actual_api_hash_here'; // YOUR api_hash (string)
```

### Step 3: Rebuild the App

```bash
npm run build
```

## How It Works

### Login Methods

The app supports two login methods:

1. **QR Code Login** (Recommended)
   - Scan QR code with Telegram mobile app
   - Fast and secure
   - No need to enter phone number in browser

2. **Phone Number Login**
   - Enter phone number with country code
   - Receive verification code via Telegram
   - Enter code to login

### File Storage

When you login with your Telegram account:

1. **Upload files** → Stored in selected group/channel
2. **Create folders** → Stored as messages with metadata
3. **Browse files** → Reads directly from Telegram chat history
4. **Cross-device** → Same files visible on all devices

### Why This is Better

| Feature | Bot API + localStorage | MTProto (User Auth) |
|---------|------------------------|---------------------|
| Chat history access | ❌ Cannot read history | ✅ Full history access |
| Cross-device sync | ❌ Per-device only | ✅ Automatic sync |
| File persistence | ⚠️ Depends on localStorage | ✅ Always in Telegram |
| Browser compatibility | ✅ Works everywhere | ⚠️ Requires modern browser |
| Setup complexity | ✅ Simple (bot token) | ⚠️ Need API credentials |

## Important Notes

### Security

- Your Telegram session is stored in browser localStorage
- Clearing browser data will log you out
- Files remain safe in Telegram even if logged out
- Never share your API credentials

### Limitations

- MTProto API requires a modern browser with WebSocket support
- Some older browsers may not work
- First login requires phone verification
- API credentials are tied to your Telegram account

### Troubleshooting

**"Cannot connect" error:**
- Check your internet connection
- Verify API_ID and API_HASH are correct
- Try refreshing the page

**"Invalid API credentials":**
- Go back to my.telegram.org
- Regenerate your API credentials
- Update the code and rebuild

**QR code not working:**
- Make sure you're using the official Telegram app
- Update Telegram to the latest version
- Try phone number login instead

## Architecture

```
User Login (QR/Phone)
    ↓
MTProto Session Created
    ↓
Store session in localStorage
    ↓
User selects group/channel
    ↓
Read chat history directly from Telegram
    ↓
Parse messages with __TCLOUD_V1__ prefix
    ↓
Display files and folders
    ↓
Upload/Download/Delete operations
    ↓
All changes sync across devices
```

## Migration from Bot API

If you were using the Bot API version:

1. Your files are still in the Telegram group/channel
2. Login with MTProto using your personal account
3. Select the same group/channel
4. Files will be read from chat history
5. No need to re-upload anything!

## Support

For issues or questions:
- Check browser console for error messages
- Verify API credentials are correct
- Make sure you're using a modern browser
- Try clearing browser data and logging in again
