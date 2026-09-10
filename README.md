# TeleCloud - Unlimited Cloud Storage via Telegram

A free, unlimited cloud storage web application that uses Telegram channels as the storage backend. No server costs, no subscriptions, no storage limits.

## 🚀 Features

- **Unlimited Storage** - Uses Telegram channels (no message limit)
- **Modern UI** - Fluent design with smooth animations
- **File Management** - Upload, download, organize in folders
- **Media Preview** - Built-in image viewer and video player
- **Real-time Transfers** - Live progress tracking
- **Speed Boost** - Experimental parallel download feature
- **100% Free** - No server costs, no subscriptions
- **Privacy First** - All data stays on your Telegram channel

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser       │────▶│  Telegram Bot API │────▶│  Telegram Cloud │
│  (Static Site)  │◀────│   (REST API)      │◀────│  (Your Channel) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
     Free Hosting           Free API               Free Storage
   (Vercel/Netlify)     (No rate limits)         (Unlimited files)
```

## 📦 How It Works

1. **Authentication**: You provide your Telegram Bot Token (created via @BotFather)
2. **Channel Selection**: Choose a channel where the bot is admin
3. **File Storage**: Files are uploaded as documents to your channel
4. **Metadata**: File paths and metadata are encoded in message captions
5. **Virtual Folders**: Folder structure is derived from file paths
6. **Downloads**: Files are downloaded via Telegram's file API

### Limitless Files Method

The app achieves "limitless" storage through these techniques:
- **No message limit**: Telegram channels can hold unlimited messages
- **Efficient metadata**: File info is encoded as compact JSON in captions
- **Virtual filesystem**: Folders are computed from paths, not stored separately
- **2GB per file**: Each file can be up to 2GB (Telegram's limit)
- **No total limit**: Combined storage is effectively unlimited

## 🌐 Free Hosting Guide (Step by Step)

### Option 1: Vercel (Recommended)

1. **Create a GitHub account** at https://github.com
2. **Push this code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/telecloud.git
   git push -u origin main
   ```
3. **Go to https://vercel.com** and sign up (use GitHub)
4. **Click "New Project"**
5. **Import your GitHub repository**
6. **Framework Preset**: Select "Vite"
7. **Click "Deploy"**
8. ✅ Done! Your app is live at `https://telecloud.vercel.app`

### Option 2: Netlify

1. **Go to https://netlify.com** and sign up
2. **Click "Add new site" → "Import an existing project"**
3. **Connect your GitHub repository**
4. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Click "Deploy"**
6. ✅ Done! Your app is live at `https://telecloud.netlify.app`

### Option 3: GitHub Pages

1. **Install gh-pages**: `npm install -D gh-pages`
2. **Add to package.json scripts**:
   ```json
   "deploy": "npm run build && gh-pages -d dist"
   ```
3. **Run**: `npm run deploy`
4. ✅ Your app is live at `https://YOUR_USERNAME.github.io/telecloud`

### Option 4: Cloudflare Pages

1. **Go to https://pages.cloudflare.com**
2. **Connect your GitHub repository**
3. **Build settings**:
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Click "Save and Deploy"**
5. ✅ Done! Free hosting with CDN

## 🤖 Telegram Bot Setup

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name for your bot (e.g., "MyCloud Storage")
4. Choose a username (must end in "bot", e.g., "mycloud_storage_bot")
5. **Copy the bot token** (you'll paste this in the app)
6. **Add the bot to your channel as admin**:
   - Go to your channel → Channel Info → Administrators → Add Admin
   - Select your bot and grant "Post Messages" permission
7. The bot must post at least one message to be detected

## ⚙️ Settings

### Speed Boost (Experimental)

The speed boost feature uses parallel HTTP connections to download file chunks simultaneously:
- **How it works**: Splits the file into chunks, downloads each chunk in parallel, then combines them
- **Best for**: Files larger than 20MB
- **Connections**: Configurable from 2-8 parallel connections
- **Warning**: May use more bandwidth; enable in Settings → Speed Boost

## 🔒 Security & Privacy

- Bot tokens are stored **only in your browser** (localStorage)
- No data is sent to any third-party server
- All file operations go directly between your browser and Telegram
- Your files remain in your Telegram channel under your control

## 🛠️ Tech Stack

- **React 18** + TypeScript
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **Framer Motion** (animations)
- **Zustand** (state management)
- **Lucide React** (icons)
- **Telegram Bot API** (storage backend)

## 📱 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## ⚠️ Limitations

- Max file size: 2GB per file (Telegram limit)
- Bot token must be kept secure (stored in browser only)
- Requires internet connection
- Channel must have the bot as admin
- Telegram API rate limits apply (but are generous)

## 📄 License

MIT License - Free to use, modify, and distribute.
