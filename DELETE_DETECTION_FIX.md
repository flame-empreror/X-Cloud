# 🐛 Delete Function Bug - Detection Logic Fixed

## Problem Identified

The delete function was still using `messages.deleteMessages` instead of `channels.deleteMessages` even though the peer was clearly a channel.

### Log Evidence
```
[MTProto] Peer: Object { _: "inputPeerChannel", accessHash: {…}, channelId: 4435359229 }
[MTProto] Detected regular chat, using messages.deleteMessages  ← WRONG!
```

The peer object had `_ === "inputPeerChannel"`, which clearly indicates it's a channel, but the detection logic was failing.

## Root Cause

The detection logic was checking `peerId < 0`, but when `peer` is an object:
```typescript
const peerId = typeof peer === 'number' ? peer : peer?.id || peer;
const isChannel = peerId < 0;
```

When `peer` is an object like `{ _: "inputPeerChannel", channelId: 4435359229, ... }`:
- `peer?.id` is `undefined` (there's no `id` property, only `channelId`)
- So `peerId` becomes the entire object
- Comparing an object to `0` with `<` always returns `false`
- So `isChannel` was always `false` for object peers!

## Solution

Fixed the detection logic to properly check the peer type:

```typescript
// Check if peer is a channel
let isChannel = false;

if (typeof peer === 'object' && peer !== null) {
  // If peer is an object, check its type
  if (peer._ === 'inputPeerChannel') {
    isChannel = true;
    console.log('[MTProto] Detected channel from peer._ === inputPeerChannel');
  } else if (peer.id && peer.id < 0) {
    isChannel = true;
    console.log('[MTProto] Detected channel from peer.id < 0');
  }
} else if (typeof peer === 'number') {
  // If peer is a number, check if it's negative
  isChannel = peer < 0;
  if (isChannel) {
    console.log('[MTProto] Detected channel from peer < 0');
  }
}
```

### Key Changes

1. **Check `peer._` property**: If it's `'inputPeerChannel'`, it's definitely a channel
2. **Check `peer.id`**: If it exists and is negative, it's a channel
3. **Handle number peers**: If peer is just a number, check if it's negative
4. **Better logging**: Log which detection method was used

## Expected Behavior After Fix

### Correct Detection
```
[MTProto] Peer: Object { _: "inputPeerChannel", channelId: 4435359229, accessHash: ... }
[MTProto] Detected channel from peer._ === inputPeerChannel
[MTProto] isChannel: true
[MTProto] Using channels.deleteMessages
[MTProto] Constructed inputChannel from inputPeerChannel
[MTProto] Delete API call result: { _: 'messages.affectedMessages', pts: 7402, ptsCount: 1 }
[MTProto] ✅ Delete appears successful
```

### Verification
```
[FileManager] Verifying deletion...
[MTProto] All message IDs: [14, 13, 12, 11, 10, 3, 2, 1]  ← Message 15 is GONE!
[FileManager] Message still exists? false
[FileManager] ✅ Message successfully deleted from Telegram
```

## Testing Steps

1. **Deploy the updated code**
2. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
3. **Open browser console** (F12)
4. **Try to delete a file or folder**
5. **Check the console logs** for:
   - `[MTProto] Detected channel from peer._ === inputPeerChannel`
   - `[MTProto] isChannel: true`
   - `[MTProto] Using channels.deleteMessages`
   - `ptsCount: 1` (or higher)
   - Message ID should NOT appear in the list after deletion

## Files Modified

- `src/services/mtproto.ts`: Fixed channel detection logic in `deleteMessage` method

## Summary

✅ Fixed channel detection logic to check `peer._` property
✅ Added proper handling for object vs number peers
✅ Added detailed logging for debugging
✅ Now correctly uses `channels.deleteMessages` for channels
✅ Delete function should now work correctly

The delete function should now properly detect channels and use the correct API to delete messages!
