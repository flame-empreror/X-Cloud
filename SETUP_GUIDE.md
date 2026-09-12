# 🚀 TeleCloud - MTProto Setup Guide

## ✅ What's New

Your app now uses **Telegram MTProto** (user account login) instead of Bot API. This means:

- ✅ **True cross-device sync** - Files persist across ALL devices automatically
- ✅ **Full chat history access** - Can read all messages in groups/channels
- ✅ **No localStorage dependency** - Everything comes from Telegram directly
- ✅ **Real-time updates** - See changes from other devices instantly

## 📋 Prerequisites

You need:
1. A Telegram account
2. API credentials from Telegram (free)
3. A group to use as storage

## 🔑 Step 1: Get API Credentials

### 1.1 Go to Telegram API Portal
1. Open https://my.telegram.org
2. Login with your phone number
3. Click **"API development tools"**

### 1.2 Create an Application
Fill out the form:
- **App title**: TeleCloud (or any name)
- **Short name**: telecloud
- **URL**: (leave empty)
- **Platform**: Web
- **Description**: Cloud storage using Telegram

Click **"Create application"**

### 1.3 Copy Your Credentials
You'll see:
- **App api_id**: A number (e.g., `12345678`)
- **App api_hash**: A string (e.g., `abc123def456...`)

**⚠️ IMPORTANT**: Save these somewhere safe!

## ⚙️ Step 2: Configure the App

### 2.1 Create .env File
In your project root, create a file named `.env`:

```env
VITE_TELEGRAM_API_ID=12345678
VITE_TELEGRAM_API_HASH=abc123def456...
```

Replace with YOUR actual credentials.

### 2.2 For Vercel Deployment
If deploying to Vercel:
1. Go to your project settings
2. Go to "Environment Variables"
3. Add:
   - `VITE_TELEGRAM_API_ID` = your api_id
   - `VITE_TELEGRAM_API_HASH` = your api_hash
4. Redeploy

### 2.3 Rebuild the App
```bash
npm run build
```

## 📱 Step 3: Login to the App

### Option A: Phone Number Login
1. Open your app
2. Click "Login with Phone Number"
3. Enter your phone number with country code (e.g., `+1234567890`)
4. Check Telegram for the verification code
5. Enter the code
6. ✅ You're logged in!

### Option B: QR Code Login
1. Open your app
2. Click "Login with QR Code"
3. Open Telegram on your phone
4. Go to Settings → Devices → Scan QR
5. Scan the QR code shown in the app
6. ✅ You're logged in!

## 📂 Step 4: Select Your Storage Group

After login, you'll see a list of your groups/channels. Select the one you want to use as storage (e.g., your group `-4435359229`).

## 🎉 Step 5: Start Using!

Now you can:
- Upload files (stored in your Telegram group)
- Create folders
- Download files
- Access from ANY device

**Files will automatically sync across all devices!**

## 🔍 How It Works

### Before (Bot API + localStorage):
```
Upload file → Telegram + localStorage
Refresh → Load from localStorage (per-device only)
Change device → Files don't appear ❌
```

### Now (MTProto):
```
Login with Telegram account
↓
App reads chat history from Telegram
↓
Shows all files and folders
↓
Works on ALL devices automatically ✅
```

## 📊 Features

### ✅ What Works
- Cross-device sync (automatic)
- Full chat history access
- File upload/download
- Folder creation
- Real-time updates
- No localStorage needed

### 🎨 UI Features
- QR code login
- Phone number login
- Group/channel selection
- File manager
- Media viewer
- Transfer tracking

## ⚠️ Important Notes

### Security
- Your API credentials are tied to YOUR Telegram account
- Don't share them publicly
- Session is stored in browser IndexedDB (more secure than localStorage)

### Privacy
- The app reads your Telegram chat history
- Only accesses the group you select for storage
- Files are stored in your Telegram group

### Limitations
- First login requires phone verification
- API credentials are per-account
- Modern browser required (for IndexedDB)

## 🐛 Troubleshooting

### "API credentials not configured"
- Check your `.env` file exists
- Verify `VITE_TELEGRAM_API_ID` and `VITE_TELEGRAM_API_HASH` are set
- Rebuild the app after adding credentials

### "Cannot connect"
- Check internet connection
- Verify API credentials are correct
- Try refreshing the page

### "QR code not working"
- Make sure you're using the official Telegram app
- Update Telegram to the latest version
- Try phone number login instead

### Files not appearing
- Make sure you selected the correct group
- Files must have been uploaded with the app
- Try refreshing

## 📚 Technical Details

### Storage
- **Session**: IndexedDB (browser-native, more secure)
- **Files**: Telegram group (unlimited, free)
- **No localStorage**: Everything from Telegram

### API Used
- **@mtcute/web**: Browser-native MTProto library
- **No Node.js polyfills needed**
- **Works in all modern browsers**

### Bundle Size
- **Total**: ~373KB (gzipped: ~113KB)
- **Optimized for web**

## 🔄 Migration from Bot API

If you were using the Bot API version:

1. Your files are still in the Telegram group
2. Login with MTProto using your personal account
3. Select the same group
4. Files will be read from chat history
5. **No need to re-upload anything!**

## 🎯 Next Steps

1. ✅ Get API credentials from my.telegram.org
2. ✅ Create `.env` file with credentials
3. ✅ Rebuild the app
4. ✅ Deploy to Vercel
5. ✅ Login with your Telegram account
6. ✅ Select your group
7. ✅ Start using!

## 💡 Tips

### For Best Experience
- Use the same Telegram account on all devices
- Keep your API credentials secure
- Use a dedicated group for storage
- Organize files with folders

### For Cross-Device Use
- Login with the same Telegram account
- Files sync automatically
- No manual intervention needed

### For Large Files
- Telegram supports up to 2GB per file
- Use stable internet connection
- Large files may take time to upload

## 🆘 Support

If you encounter issues:
1. Check browser console (F12) for errors
2. Verify API credentials are correct
3. Make sure you're using a modern browser
4. Try clearing browser data and logging in again

## 🎉 Success!

You now have a **true cloud storage solution** that:
- ✅ Works across all devices
- ✅ Persists permanently in Telegram
- ✅ No server costs
- ✅ No localStorage dependency
- ✅ Real-time sync
- ✅ Full chat history access

**Enjoy your cross-device cloud storage!** 🚀
