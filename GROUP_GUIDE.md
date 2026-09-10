# 🎯 Quick Start Guide - TeleCloud for Groups

## ✅ What Changed

I've simplified the app to focus on **groups only** (removed channel complexity). The app now works with:
- ✅ Regular groups
- ✅ Supergroups  
- ✅ Private groups
- ✅ Public groups

## 🚀 How to Use (3 Simple Steps)

### Step 1: Create a Bot
1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Follow the instructions to create your bot
4. **Copy the bot token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 2: Add Bot to Your Group
1. Open your group in Telegram
2. Click the **group name** at the top
3. Click **"Add Members"**
4. Search for your bot's username
5. **Add the bot as a member** ⚠️ (This is required!)
6. Click group name again → **"Administrators"** → **"Add Admin"**
7. Select your bot
8. Enable **"Post Messages"** permission
9. Click **"Save"**

### Step 3: Get Your Group ID
1. Open [Telegram Web](https://web.telegram.org) in your browser
2. Click on your group
3. Look at the URL in your browser's address bar
4. You'll see something like: `https://web.telegram.org/k/#-4435359229`
5. **Copy the number after `#`** (including the minus sign)
6. Example: `-4435359229`

### Step 4: Connect in TeleCloud
1. Open your TeleCloud app
2. Enter your **bot token**
3. Enter your **group ID** (e.g., `-4435359229`)
4. Click **"Connect Group"**
5. ✅ Done! You can now upload files!

## 📝 Important Notes

### ⚠️ Bot Must Be Added as Member First
The most common issue is that people try to make the bot an admin without adding it as a member first. **This won't work!**

**Correct order:**
1. Add bot as member ✅
2. Then make bot admin ✅

**Wrong order:**
1. Try to make bot admin ❌ (bot not in group yet)
2. Fails! ❌

### 🆔 Group ID Format
- Your group ID will start with a **minus sign** (`-`)
- Example: `-4435359229`
- Don't include the `#` symbol
- Don't include any other characters

### 🔍 How to Find Group ID
**Method 1: Telegram Web (Easiest)**
1. Go to https://web.telegram.org
2. Click your group
3. Look at URL: `https://web.telegram.org/k/#-4435359229`
4. Copy: `-4435359229`

**Method 2: Using a Bot**
1. Add `@RawDataBot` to your group temporarily
2. It will post a message with your group ID
3. Copy the ID
4. Remove `@RawDataBot` from the group

## 🎨 Features

Once connected, you can:
- ✅ Upload files (drag & drop or click upload button)
- ✅ Create folders to organize files
- ✅ Download files
- ✅ Preview images and videos
- ✅ Delete files
- ✅ Search files
- ✅ View in grid or list mode

## 🐛 Troubleshooting

### "Bot cannot see this group"
**Solution:** The bot is not a member of the group yet.
1. Open your group
2. Click "Add Members"
3. Search for your bot
4. Add it as a member
5. Try connecting again

### "Bot is not a member of this group"
**Solution:** Same as above - add the bot as a member first.

### "Invalid bot token"
**Solution:** 
1. Go to @BotFather
2. Send `/mybots`
3. Select your bot
4. Click "API Token"
5. Copy the full token
6. Make sure there are no extra spaces

### "Chat not found"
**Solution:** 
1. Make sure you copied the correct group ID
2. The ID should start with `-`
3. Don't include the `#` symbol
4. Example: `-4435359229` (correct) vs `#-4435359229` (wrong)

## 💡 Tips

1. **Use the numeric ID** - It's more reliable than usernames
2. **Test with a small file first** - Make sure uploads work before uploading large files
3. **Check bot permissions** - Make sure "Post Messages" is enabled
4. **Keep bot token safe** - Don't share it publicly

## 🎯 Success Checklist

Before connecting, verify:
- [ ] Bot token is correct (from @BotFather)
- [ ] Bot is added as a member to the group
- [ ] Bot is an administrator with "Post Messages" permission
- [ ] Group ID is correct (starts with `-`)
- [ ] Group ID doesn't include `#` symbol

## 🆘 Still Having Issues?

If you're still getting errors:

1. **Check browser console** (Press F12)
   - Look for error messages
   - They will tell you exactly what's wrong

2. **Verify bot is in group**
   - Open group in Telegram
   - Click group name
   - Check "Members" list
   - Your bot should be there

3. **Test with test-bot.html**
   - Go to `https://yourdomain.com/test-bot.html`
   - Test your bot token
   - Test your group ID
   - This will show you exactly what's working

## 📊 How It Works

The app uses your Telegram group as storage:
- Files are uploaded as documents to the group
- File metadata is stored in message captions
- The bot manages all file operations
- Your group becomes your personal cloud storage!

## 🎉 You're All Set!

Once connected, you have:
- ✅ Unlimited storage (Telegram's limit is 2GB per file)
- ✅ Access from anywhere
- ✅ Free forever
- ✅ Your data stays on Telegram
- ✅ Fast uploads and downloads

**Enjoy your free cloud storage!** 🚀
