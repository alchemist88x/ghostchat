# 👻 GhostChat — Anonymous Ephemeral Messaging Platform

GhostChat is a production-ready, privacy-first, temporary messaging web application built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **MongoDB Atlas**, **Ably Realtime Messaging**, **AWS S3 / Cloudflare R2 Storage**, and **PWA (Progressive Web App)** support.

---

## ✨ Features

### 🔒 1. Ephemeral & Privacy-First
- **Zero Registration Required**: Guests can create and join temporary chat rooms instantly without providing an email or phone number.
- **72-Hour Auto-Purge**: Chats automatically expire after 3 days. All messages, participant data, and uploaded media are completely erased from MongoDB and S3/R2 storage via an automated cleanup engine.
- **Strict Personal & Group Capacity**: Personal chats are atomically limited to 2 participants. Group chats support configurable limits from 10 to 100 members.

### ⚡ 2. Realtime Messaging & Read Receipts
- **Ably Realtime WebSockets**: Sub-second message delivery, realtime typing indicators, and presence updates.
- **3-Level Tick System**:
  - **1 Tick (✓)**: Sent to server.
  - **2 Ticks (✓✓)**: Delivered to recipient.
  - **3 Ticks (✓✓✓)**: Viewed/Read in cyan checkmarks.
- **Audio & System Notifications**: Built-in Web Audio notification chime and native system notifications when the app or browser window is minimized.

### 📷 3. Rich Media & Direct S3 Storage
- **Native Mobile Camera**: Direct camera capture support (`capture="environment"`).
- **Voice Notes**: Native audio recording with dynamic playback waveforms.
- **Organized Storage Hierarchy**: Server-side direct uploads stored under `ghostchat/<chatFolder>/<date>/<file>`.

### 👤 4. Optional User Accounts & Security
- **Unique Usernames**: Enforced unique account registration.
- **6-Digit Recovery Security Code**: Generated on registration for password resets.
- **Forgot Password Flow**: Recover accounts using your 6-digit code or default fallback `123456`.
- **Dedicated Account Settings (`/account`)**: Manage profile, change password, or permanently delete account.
- **Single Auth Sidebar Footer**: Clean, unified auth & account toggle in the left sidebar.

### 📱 5. Responsive PWA & Web App
- **Installable PWA**: Includes web app manifest, custom service worker (`sw.js`), and install prompt.
- **Full-Width Active Feed**: Modern 3-column layout (Left Sidebar, Active Chat Feed, Right Group Info Panel).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS & Vanilla CSS Glassmorphism |
| **Database** | MongoDB Atlas |
| **Realtime** | Ably WebSockets SDK |
| **Storage** | AWS S3 / Cloudflare R2 |
| **Validation** | Zod Schema Validation |
| **Testing** | Node.js Test Runner |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ installed
- MongoDB Atlas cluster URI
- Ably API key (Free tier from [ably.com](https://ably.com))
- AWS S3 bucket or Cloudflare R2 credentials

### 2. Installation

```bash
# Clone repository
git clone https://github.com/your-username/ghostchat.git
cd ghostchat

# Install dependencies
npm install
```

### 3. Environment Setup

Copy `env.example` to `.env.local`:

```bash
cp env.example .env.local
```

Configure your environment variables in `.env.local`:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ghostchat?retryWrites=true&w=majority

# Application Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Ably Realtime Key
ABLY_API_KEY=your_ably_api_key

# AWS S3 / Cloudflare R2 Credentials
FILESYSTEM_DISK=s3
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_REGION=us-east-1
S3_BUCKET=your_bucket_name
S3_ENDPOINT=https://your_bucket.s3.us-east-1.amazonaws.com
S3_CLOUDFRONT_URL=https://your_cloudfront_domain.cloudfront.net

# Session Secret
SESSION_SECRET=your_super_secret_32_character_string
```

### 4. Running the App

```bash
# Run Development Server
npm run dev

# Open in Browser
http://localhost:3000
```

---

## 🧪 Testing & Verification

```bash
# Run TypeScript compilation check
npx tsc --noEmit

# Run Unit Test Suite
npm test
```

---

## 📜 License

MIT License. Built for privacy, speed, and temporary communication.
