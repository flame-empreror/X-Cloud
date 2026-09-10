# 🔧 Troubleshooting Guide - Login Issues

## Problem: Cannot Connect to Channel

If you're having trouble connecting your channel, follow this checklist:

---

## ✅ Step-by-Step Checklist

### 1. Verify Bot Token
- [ ] Token format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
- [ ] No extra spaces or characters
- [ ] Token is from @BotFather (not from another source)
- [ ] Bot is not deleted or deactivated

**How to get a new token:**
1. Open Telegram and search for `@BotFather`
2. Send `/mybots`
3. Select your bot
4. Click "API Token"
5. Copy the token

---

### 2. Add Bot as Channel Admin

**This is the #1 reason for connection failures!**

**For Public Channels:**
1. Open your channel
2. Click channel name → "Administrators" → "Add Admin"
3. Search for your bot's username
4. Enable these permissions:
   - ✅ Post Messages
   - ✅ Edit Messages
   - ✅ Delete Messages
   - ✅ Manage Chat (optional but recommended)
5. Click "Save"

**For Private Channels:**
1. Open your channel
2. Click channel name → "Edit" → "Administrators" → "Add Admin"
3. Search for your bot's username
4. Enable the same permissions as above
5. Click "Save"

**Verify bot is admin:**
- Go to channel info
- Click "Administrators"
- Your bot should be in the list with "Administrator" role

---

### 3. Enter Correct Channel Identifier

**For Public Channels:**
- Use the **username** (without @)
- Example: If your channel link is `t.me/mychannel`, enter: `mychannel`
- NOT: `@mychannel`
- NOT: `https://t.me/mychannel`

**For Private Channels:**
- Use the **numeric ID** (starts with -100)
- Example: `-1001234567890`

**How to find your channel ID:**

**Method 1: Using a bot**
1. Add `@RawDataBot` to your channel (temporarily)
2. It will post the channel ID
3. Remove the bot after getting the ID

**Method 2: Using Telegram Web**
1. Open https://web.telegram.org
2. Go to your channel
3. Look at the URL: `https://web.telegram.org/z/#-1001234567890`
4. The number after `#` is your channel ID

**Method 3: Using @userinfobot**
1. Forward a message from your channel to `@userinfobot`
2. It will reply with the channel ID

---

### 4. Common Error Messages & Solutions

#### ❌ "Bot is not a member of this channel"
**Solution:** Add the bot as administrator (see step 2)

#### ❌ "Channel not found"
**Solutions:**
- Check spelling of username
- For private channels, use numeric ID (not username)
- Make sure channel exists and is not deleted

#### ❌ "Unauthorized" or "401"
**Solution:** Your bot token is invalid
- Get a new token from @BotFather
- Make sure you copied the entire token

#### ❌ "PEER_ID_INVALID"
**Solutions:**
- For public channels: use username without @
- For private channels: use numeric ID starting with -100
- Don't mix formats

#### ❌ "Bad Request: chat not found"
**Solutions:**
- Bot must be added to the channel first
- Check if you're using the correct identifier
- Try the numeric ID instead of username

---

## 🎯 Quick Test

Before connecting your channel, test your bot:

1. **Test bot token:**
   - Open: `https://api.telegram.org/bot<YOUR_TOKEN>/getMe`
   - Replace `<YOUR_TOKEN>` with your actual token
   - Should return bot info in JSON format
   - If you see "Unauthorized", token is invalid

2. **Test bot in channel:**
   - Send a message in your channel
   - The bot should be able to see it (if it has admin rights)
   - Try: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   - Should show recent messages

---

## 📋 Complete Setup Example

### Example 1: Public Channel

**Channel:** `t.me/myawesomechannel`

**Steps:**
1. Get bot token: `123456789:ABCdef...`
2. Add bot as admin to `@myawesomechannel`
3. In TeleCloud:
   - Enter token: `123456789:ABCdef...`
   - Enter channel: `myawesomechannel` (without @)
4. ✅ Connected!

### Example 2: Private Channel

**Channel ID:** `-1001234567890`

**Steps:**
1. Get bot token: `123456789:ABCdef...`
2. Add bot as admin to private channel
3. In TeleCloud:
   - Enter token: `123456789:ABCdef...`
   - Enter channel: `-1001234567890`
4. ✅ Connected!

---

## 🆘 Still Not Working?

### Debug Checklist:

- [ ] Bot token is correct (test with /getMe)
- [ ] Bot is added as administrator to the channel
- [ ] Bot has "Post Messages" permission
- [ ] Using correct channel identifier format
- [ ] For public channels: username without @
- [ ] For private channels: numeric ID with -100 prefix
- [ ] Channel exists and is not deleted
- [ ] Internet connection is working
- [ ] Telegram API is accessible (not blocked)

### Get Help:

1. **Check Telegram API status:**
   - Visit: https://twitter.com/telegram
   - See if there are any outages

2. **Test your setup manually:**
   ```
   https://api.telegram.org/bot<TOKEN>/getChat?chat_id=<CHANNEL>
   ```
   - Replace `<TOKEN>` and `<CHANNEL>`
   - Should return channel info
   - If error, read the error message carefully

3. **Create a new bot:**
   - Sometimes bots get corrupted
   - Create a fresh bot with @BotFather
   - Try the new token

---

## 💡 Pro Tips

1. **Use public channels for testing** - easier to debug
2. **Keep your bot token secure** - don't share it publicly
3. **One bot per channel** - don't reuse bots across multiple channels
4. **Test with a small file first** - verify uploads work before uploading large files
5. **Check browser console** - press F12 and look for error messages

---

## 🎓 Understanding the Error Messages

The app now provides detailed error messages. Here's what they mean:

| Error Message | What It Means | Solution |
|--------------|---------------|----------|
| "Bot is not a member" | Bot not added to channel | Add bot as admin |
| "Channel not found" | Wrong username/ID | Check spelling and format |
| "Unauthorized" | Invalid bot token | Get new token from @BotFather |
| "PEER_ID_INVALID" | Wrong ID format | Use correct format for channel type |
| "Bot is not an administrator" | Bot lacks admin rights | Grant admin permissions |

---

## 📞 Need More Help?

If you've followed all steps and still can't connect:

1. **Double-check everything** - Go through the checklist again
2. **Try a different channel** - Test with another channel
3. **Try a different bot** - Create a new bot
4. **Check browser console** - Press F12, look for errors
5. **Clear browser cache** - Sometimes cached data causes issues
6. **Try incognito mode** - Rules out browser extensions

---

**Remember:** The most common issue is **forgetting to add the bot as administrator**. 90% of connection failures are solved by this step!
