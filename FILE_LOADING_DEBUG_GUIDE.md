# 🔍 File Loading Debug Guide

## Issue
Uploaded files are not showing up after page refresh, even though:
- ✅ Upload progress works
- ✅ Channel persistence works
- ✅ Files are successfully uploaded to Telegram

## What I've Added

I've added **comprehensive logging** to identify exactly where the issue is:

### 1. MTProto Service Logging (`src/services/mtproto.ts`)
```typescript
console.log('[MTProto] getMessages called for chatId:', chatId, 'limit:', limit);
console.log('[MTProto] getMessages returned', messages.length, 'messages');
console.log('[MTProto] First message:', messages[0]);
```

### 2. FileManager Logging (`src/components/FileManager.tsx`)
```typescript
console.log('[FileManager] Loading chat history for chat:', chat.id, chat.title);
console.log('[FileManager] Retrieved', messages.length, 'messages');
console.log('[FileManager] First message sample:', messages[0]);
console.log('[FileManager] First message keys:', Object.keys(messages[0]));

// For each message:
console.log('[FileManager] Processing message ID:', msg.id);
console.log('[FileManager] Message object:', msg);
console.log('[FileManager] Caption found:', caption.substring(0, 100));

// When metadata is found:
console.log('[FileManager] Parsing JSON:', jsonStr);
console.log('[FileManager] Parsed metadata:', metadata);
console.log('[FileManager] Created file item:', fileItem);

// Final summary:
console.log('[FileManager] Total files loaded:', loadedFiles.length);
console.log('[FileManager] Files:', loadedFiles);
```

## How to Debug

### Step 1: Deploy the Updated Code
Push the latest changes to your repository and redeploy to Vercel.

### Step 2: Upload a Test File
1. Login to your app
2. Select your channel
3. Upload a small test file (e.g., a text file or small image)
4. Wait for upload to complete
5. Verify the file appears in the file manager

### Step 3: Refresh the Page
1. Press F5 or Ctrl+R to refresh the page
2. **Immediately open the browser console (F12)**
3. Look for the `[MTProto]` and `[FileManager]` logs

### Step 4: Analyze the Logs

#### What to Look For:

**A. Check if messages are being retrieved:**
```
[MTProto] getMessages called for chatId: -1001234567890 limit: 100
[MTProto] getMessages returned X messages
```

- If `X = 0`: The API is not returning any messages
- If `X > 0`: Messages are being retrieved, continue checking

**B. Check the message structure:**
```
[FileManager] First message sample: { ... }
[FileManager] First message keys: [ 'id', 'text', 'date', ... ]
```

Look at the keys array. The text/caption could be in:
- `text`
- `message`
- `caption`
- `content`
- `body`

**C. Check if caption is being found:**
```
[FileManager] Caption found: __TCLOUD_V1__{"name":"test.txt",...}
```

- If you see the metadata: Great! The caption is being found
- If you see empty string or different text: The property name is wrong

**D. Check if metadata is being parsed:**
```
[FileManager] Parsing JSON: {"name":"test.txt","path":"/",...}
[FileManager] Parsed metadata: { name: 'test.txt', path: '/', ... }
```

- If parsing succeeds: The JSON is valid
- If parsing fails: Check the error message

**E. Check the final count:**
```
[FileManager] Total files loaded: X
[FileManager] Files: [ ... ]
```

- If `X = 0`: No files were recognized
- If `X > 0`: Files were loaded but might not be displaying

## Common Issues and Solutions

### Issue 1: No Messages Retrieved
**Symptom:** `[MTProto] getMessages returned 0 messages`

**Possible Causes:**
- Wrong chat ID
- Bot doesn't have access to the channel
- Channel is empty
- API error

**Solution:**
- Verify the chat ID is correct
- Check if you can see messages in the Telegram app
- Check console for error messages

### Issue 2: Wrong Property Name
**Symptom:** Messages are retrieved but caption is empty

**Example:**
```
[FileManager] First message keys: [ 'id', 'message', 'date', 'media' ]
[FileManager] Caption found: 
```

**Solution:**
The text is in `message` instead of `text`. Update the code:
```typescript
const caption = msg.message || msg.text || '';
```

### Issue 3: Caption Format Mismatch
**Symptom:** Caption is found but doesn't start with `__TCLOUD_V1__`

**Example:**
```
[FileManager] Caption found: Some other text
```

**Possible Causes:**
- File was uploaded without metadata
- Caption was truncated
- Different upload method was used

**Solution:**
- Re-upload the file using the app
- Check if the caption is being set correctly during upload

### Issue 4: JSON Parsing Error
**Symptom:** Caption starts with `__TCLOUD_V1__` but parsing fails

**Example:**
```
[FileManager] Parsing JSON: {"name":"test.txt",...
[FileManager] Failed to parse file meta: SyntaxError: Unexpected end of JSON input
```

**Possible Causes:**
- Caption was truncated (Telegram has a 1024 character limit for captions)
- JSON is malformed

**Solution:**
- Check if the metadata JSON is too long
- Simplify the metadata structure
- Check the upload code to ensure complete JSON is sent

### Issue 5: Files Loaded But Not Displaying
**Symptom:** `Total files loaded: X` where X > 0, but files don't appear

**Possible Causes:**
- Files are in a different path
- Path filtering is wrong
- UI rendering issue

**Solution:**
- Check the `path` property in the loaded files
- Verify `currentPath` state
- Check if files are being filtered out

## Expected Successful Flow

Here's what you should see in the console when everything works:

```
[MTProto] getMessages called for chatId: -1001234567890 limit: 100
[MTProto] getMessages returned 5 messages
[MTProto] First message: { id: 123, text: '__TCLOUD_V1__{...}', ... }

[FileManager] Loading chat history for chat: -1001234567890 My Channel
[FileManager] Retrieved 5 messages
[FileManager] First message sample: { id: 123, text: '__TCLOUD_V1__{...}', ... }
[FileManager] First message keys: [ 'id', 'text', 'date', 'media' ]

[FileManager] Processing message ID: 123
[FileManager] Message object: { id: 123, text: '__TCLOUD_V1__{...}', ... }
[FileManager] Caption found: __TCLOUD_V1__{"name":"test.txt","path":"/","size":1234,...}
[FileManager] Parsing JSON: {"name":"test.txt","path":"/","size":1234,...}
[FileManager] Parsed metadata: { name: 'test.txt', path: '/', size: 1234, ... }
[FileManager] Created file item: { id: '123', name: 'test.txt', ... }

[FileManager] Total files loaded: 1
[FileManager] Files: [ { id: '123', name: 'test.txt', ... } ]
```

## Next Steps

1. **Deploy** the updated code with logging
2. **Upload** a test file
3. **Refresh** the page
4. **Open console** (F12)
5. **Copy ALL logs** that start with `[MTProto]` or `[FileManager]`
6. **Share the logs** so I can identify the exact issue

## Quick Test

You can also test the API directly in the browser console:

```javascript
// Test if getMessages works
const messages = await window.mtprotoService.getMessages(YOUR_CHAT_ID, 10);
console.log('Messages:', messages);
console.log('First message:', messages[0]);
console.log('First message keys:', Object.keys(messages[0]));
```

Replace `YOUR_CHAT_ID` with your actual chat ID (the negative number like `-1001234567890`).

---

**The logging is now in place. Deploy and share the console logs to identify the exact issue!** 🔍
