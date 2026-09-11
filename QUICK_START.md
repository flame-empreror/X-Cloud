# 🚀 Quick Start Guide - MTProto Version

## ⚡ TL;DR - What You Need To Do RIGHT NOW

### 1. Get API Credentials (5 minutes)
1. Go to **https://my.telegram.org**
2. Login with your phone number
3. Click "API development tools"
4. Create an app (fill in any name/description)
5. Copy **api_id** (number) and **api_hash** (string)

### 2. Update Code (1 minute)
Open `src/services/telegram-mtproto.ts` and replace:
```typescript
const API_ID = 29371144;
const API_HASH = 'b1c5e3b87a2e7c9d0f1a2b3c4d5e6f7';
```

With YOUR credentials:
```typescript
const API_ID = YOUR_API_ID_HERE;
const API_HASH = 'YOUR_API_HASH_HERE';
```

### 3. Build & Deploy (2 minutes)
```bash
npm run build
# Then deploy to Vercel as usual
```

### 4. Login & Test
1. Open your app
2. Login with QR code or phone number
3. Select your group (-4435359229)
4. Your files will load automatically!

---

## 🎯 What This Solves

### ❌ Old Problem
- Files disappeared after refresh
- Different devices showed different files
- Needed localStorage (unreliable)

### ✅ New Solution
- Files persist permanently in Telegram
- All devices show the same files
- No localStorage needed
- Real-time sync across devices

---

## 📱 How Login Works

### QR Code Method (Easiest)
1. App shows QR code
2. Open Telegram on your phone
3. Settings → Devices → Scan QR
4. Scan the code
5. Done! You're logged in

### Phone Number Method
1. Enter phone number (with country code)
2. Get verification code in Telegram
3. Enter the code
4. Done! You're logged in

---

## 🗂️ How File Storage Works Now

```
Your Telegram Account
    ↓
Login with QR/Phone
    ↓
Select Group/Channel
    ↓
App reads chat history
    ↓
Shows all files & folders
    ↓
Upload → Stored in group
    ↓
Download → From group
    ↓
Works on ALL devices ✅
```

---

## 🔍 What You'll See

### Login Screen
- Beautiful gradient UI
- QR code or phone login options
- Clear instructions

### Channel Selection
- List of all your groups/channels
- Shows channel type (group/channel)
- Click to select

### File Manager
- Same as before
- But now loads from Telegram history
- Files persist across refreshes
- Works on all devices

---

## ⚠️ Important Notes

### Security
- API credentials are tied to YOUR Telegram account
- Don't share them publicly
- Session stored in browser (clear to logout)

### Your Files
- Still stored in your Telegram group
- Nothing changed about file storage
- Just the way we READ them changed

### Compatibility
- Works on modern browsers
- Chrome, Firefox, Safari, Edge
- Mobile browsers work too

---

## 🆘 Troubleshooting

### "Cannot connect"
- Check internet
- Verify API credentials are correct
- Refresh page

### QR code not working
- Update Telegram app
- Try phone login instead

### Files not showing
- Make sure you selected the right group
- Files must have been uploaded with the app
- Try refreshing

---

## 📊 Comparison

| Feature | Bot API + localStorage | MTProto (New) |
|---------|------------------------|---------------|
| Cross-device sync | ❌ No | ✅ Yes |
| File persistence | ⚠️ Depends on localStorage | ✅ Always |
| Chat history | ❌ Cannot read | ✅ Full access |
| Setup | ✅ Simple (bot token) | ⚠️ Need API creds |
| Reliability | ⚠️ Per-device | ✅ Always synced |

---

## 🎉 You're Ready!

Just 3 steps:
1. Get API credentials from my.telegram.org
2. Update the code
3. Build and deploy

Then login and enjoy true cloud storage that works everywhere! 🚀
