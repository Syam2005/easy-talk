# Easy Talk — Setup & Run Guide

A full-stack, **web-only** real-time chat app: direct chats, group chats, AI
conversation summaries, and free calls via Google Meet. Built on free,
self-hosted tools wherever possible — no per-day limits, no API credits.

---

## 1. Prerequisites (install once)

| Tool | Why | Install |
|---|---|---|
| Node.js 18+ | Runs backend & frontend | https://nodejs.org |
| MongoDB Community | Stores users/messages, free & self-hosted | https://www.mongodb.com/try/download/community |
| Ollama (optional) | Powers the AI summarizer + built-in assistant bot | https://ollama.com |

Everything **except** MongoDB is optional — the app runs and chats work fine
without Ollama or Google set up; you just won't get summaries/the bot, or Meet
calls, until you configure them.

If you install Ollama, pull a model once:
```bash
ollama pull llama3.1:8b
# or, on a lighter machine:
ollama pull phi3   # then set OLLAMA_MODEL=phi3 in backend/.env
```

Start MongoDB locally (varies by OS):
```bash
mongod --dbpath /path/to/your/data/folder
```

---

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env   # already has a real JWT_SECRET filled in — nothing to edit to run locally
npm run dev
```
You should see:
```
✅ MongoDB connected
✅ Agenda scheduler started
🚀 Easy Talk backend running on http://localhost:5000
```
If that last line never shows up, the server crashed before starting —
almost always because MongoDB isn't running.

---

## 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```
Open the printed URL (usually `http://localhost:5173`). API calls are
automatically proxied to the backend on port 5000 (see `vite.config.js`), so
no `.env` editing is needed for local dev.

**For a single-server deployment** (one port serves everything):
```bash
cd frontend && npm run build
```
Then just run the backend — it automatically serves the built frontend from
the same port (see `server.js`).

---

## 4. Try it out

1. Register two accounts (a second browser tab/incognito window works for the second).
2. Pick each other from the sidebar and chat in real time.
3. Click the clock icon to **schedule a message** for later — it delivers automatically even if you close the tab.
4. Click **Summarize** to get an AI recap of a conversation (needs Ollama running).
5. Create a **group**, invite people, and chat together.
6. Click **Google Meet** in a chat header to start a free video call (needs Google connected — see Section 7).

---

## 5. Project structure

```
easytalk/
├── backend/
│   └── src/
│       ├── config/db.js              # MongoDB connection
│       ├── models/                   # User, Message, Group, FriendRequest, ...
│       ├── middleware/auth.js        # JWT guard
│       ├── controllers/              # auth, messages, groups, friends, summary, meet, google
│       ├── routes/                   # REST endpoints
│       ├── services/
│       │   ├── agendaService.js      # persistent message scheduling
│       │   ├── ollamaService.js      # local AI summarization + bot replies
│       │   ├── pushService.js        # Web Push notifications
│       │   └── googleContactsService.js  # OAuth, contacts import, Meet link creation
│       ├── sockets/socketHandler.js  # real-time messaging, typing, presence
│       └── server.js                 # entry point
└── frontend/
    └── src/
        ├── context/                  # Auth + Socket providers
        ├── pages/Chat.jsx
        └── components/               # Sidebar, ChatWindow, MessageInput, FriendRequests, ...
```

---

## 6. Feature checklist

- ✅ Real-time direct + group messaging (Socket.io), typing indicators, online/offline status
- ✅ Message scheduling (persists across restarts)
- ✅ AI conversation summaries (local Ollama, direct chats)
- ✅ Chat requests — send/accept/decline before you can message someone
- ✅ Group chats — create a group, invite friends, they accept to join; existing members can add more people, or exit a group, later
- ✅ Edit your own sent messages (hover a message → pencil icon), marked "· edited"
- ✅ **Learning page** — search any concept, get it explained from a GeeksforGeeks article (or the AI's own knowledge if the article can't be fetched), and save explanations for later
- ✅ **Calls via Google Meet** — free, real Meet links, no WebRTC/TURN server to run yourself
- ✅ Google Contacts import — find friends already on Easy Talk
- ✅ Built-in AI assistant contact, powered by local Ollama
- ✅ Voice messages and file/image attachments
- ✅ Push notifications (self-hosted Web Push, VAPID keys)
- ✅ Installable as a PWA (desktop or mobile browser — no native app build)

---

## 7. Calls via Google Meet (free, no server relay)

Instead of building and maintaining our own WebRTC/TURN infrastructure, calls
work by generating a real Google Meet link through your own Google Calendar,
free, using the same Google account you connect for Contacts import:

- Click **Google Meet** in any chat (direct or group) header.
- Easy Talk creates a short calendar event with a Meet link attached, using
  *your* Google account, opens it for you in a new tab, and drops the link
  into the chat as a normal message so everyone else can tap it to join.
- No call signaling, STUN/TURN servers, or peer-to-peer media code to run —
  Google's infrastructure handles the actual call.

**Setup (one-time, ~5 minutes) — reuses the same Google OAuth client used for Contacts:**

1. Go to https://console.cloud.google.com/apis/credentials and create/open a project.
2. Enable both the **People API** and the **Google Calendar API** under "APIs & Services" → "Library".
3. Under "Credentials" → "Create Credentials" → "OAuth client ID":
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:5000/api/google/callback`
4. Copy the Client ID and Secret into `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxx
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback
   ```
5. Restart the backend. In the app, open **Chat requests (people icon)** → **Connect Google**.
6. That's it — the **Google Meet** button in any chat now works for that account.

**If someone taps "Google Meet" without connecting Google first:** they get a
clear toast telling them to connect their account — the *other* person in the
chat doesn't need to connect anything, since only the person starting the
call needs Google access; everyone else just clicks the link.

**If you already connected Google before this feature existed:** your old
connection only granted Contacts permission, not Calendar. Disconnect and
reconnect once (People icon → Google) to grant the new scope.

---

## 8. Learning page (GeeksforGeeks + AI, free)

Click **"Learn a concept"** in the sidebar to open a dedicated page:

1. Search any concept (e.g. "binary search", "OOP inheritance", "DBMS normalization").
2. Results come from a live search of GeeksforGeeks specifically (via a free,
   keyless DuckDuckGo search scoped to `site:geeksforgeeks.org` — GfG has no
   public search API of its own).
3. Click a result — the backend fetches that article and your local Ollama
   model turns it into a clean **Overview / Key Points / Example / Common
   Mistakes** explanation, shown as the first message in a chat.
4. **Keep asking questions about it** — the chat stays underneath, grounded
   in the same article/topic, so follow-ups like "can you give another
   example?" or "how is this different from X?" get answered in context
   instead of starting over each time.
5. If an article can't be fetched or parsed (site layout changes, network
   hiccup, etc.), it automatically falls back to the AI explaining the
   concept from its own knowledge instead of just failing — clearly labeled
   "AI's general knowledge" so you know the difference.
6. Every topic (explanation + the whole follow-up conversation) is saved
   automatically — click **"Saved"** to reopen one and keep chatting.

Since this scrapes a real webpage's HTML rather than using an official API,
it's inherently best-effort: if GeeksforGeeks changes their page layout, the
extraction may need a small update in `backend/src/services/learnService.js`.
Needs Ollama running, same as the summarizer.

---

## 9. The built-in AI assistant ("Easy Talk Assistant")

Every user automatically has a contact called **Easy Talk Assistant** pinned
in their Direct list. Message it like any other contact — it replies using
your local Ollama model, keeps the last 10 messages of context, and never
leaves your server. It can't be Meet-called or summarized (there's no
conversation to have a call about).

## 10. Voice messages & attachments

Click the mic icon to record a voice note, or the paperclip to attach an
image/file — both upload to `backend/uploads/` via the same `/api/upload`
endpoint (25MB limit by default, configurable in `uploadRoutes.js`).

While recording, the browser's built-in speech recognition (best supported
in Chrome/Edge) quietly captures a transcript alongside the audio, so the
message shows readable text under the player and — importantly — so the
**Easy Talk Assistant bot can actually understand and reply to voice
messages**, not just typed ones. If your browser doesn't support speech
recognition (or it mishears you), the voice message still sends fine with no
transcript; the bot will reply asking you to type it instead of staying
silent.

## 11. AI Voice Assistant (multi-language)

The sidebar's voice assistant button opens a full spoken conversation with
the bot, using the browser's built-in Web Speech API (free, no cloud speech
service) in any of 10 languages. Voice quality for non-English languages
depends on what voices your OS has installed.

## 12. Push notifications (free, self-hosted)

`backend/.env` already ships with a working VAPID keypair, so push works out
of the box locally — click **"Turn on notifications"** in the sidebar. To
generate your own keys for a real deployment:
```bash
cd backend
node -e "console.log(require('web-push').generateVAPIDKeys())"
```
then put the two keys in `backend/.env` and restart. Notifications only fire
for people who *aren't* actively connected at that moment. On iPhone, push
only works once the app is added to the Home Screen (iOS 16.4+, Safari only)
— a Safari platform rule, not an Easy Talk limitation.

## 13. Installing as a PWA (works on desktop and phones, no native app needed)

Since this is web-only now, "installing" it just means installing the
website like any Progressive Web App:

- **Desktop Chrome/Edge:** address bar → install icon, or menu → "Install Easy Talk."
- **Android Chrome:** tap the "Install Easy Talk" banner, or menu → "Add to Home Screen."
- **iPhone Safari:** Share button → "Add to Home Screen" (Safari only, not Chrome-on-iOS).

This needs HTTPS (or `localhost`) — a browser rule for service workers and
push, not something Easy Talk controls. A free cert via Let's Encrypt/Caddy
handles this in minutes when you deploy for real.

---

## 14. Deploying for real, without Render or MongoDB Atlas (still free)

Render and Atlas were just the easiest defaults to mention earlier — neither
is required. MongoDB just needs to be *running somewhere reachable*; it
doesn't have to be Atlas's managed cloud version. Two genuinely free paths:

### Option A — a free-forever cloud VM (recommended if you want it reachable from anywhere, always on)

**Oracle Cloud Free Tier** is a real, permanently-free tier (up to 4 ARM CPUs
/ 24GB RAM) — enough for MongoDB + Node + Ollama on one box, no credit card
traps, no 30-day trial.

1. Spin up an "Always Free" ARM instance (Ubuntu).
2. Install Node, **MongoDB Community Edition** (self-hosted, not Atlas), and optionally Ollama on it.
3. Run the backend with `pm2` so it survives reboots: `npm i -g pm2 && pm2 start src/server.js`.
4. `cd frontend && npm run build`, serve `dist/` with Nginx (or let the backend serve it directly, per Section 3).
5. Set your real `GOOGLE_REDIRECT_URI` (and re-register it in Google Cloud Console) to match your deployed domain.

### Option B — run it from your own PC, exposed via a free tunnel (no VPS at all)

If you don't want a separate server, you can run MongoDB + the backend right
on your own laptop/desktop and make it reachable from the internet with a
**free Cloudflare Tunnel** — no port forwarding, no router config, real
HTTPS, and it's free forever (unlike ngrok's free tier, which is
session-limited):

```bash
# One-time setup
cloudflared tunnel login
cloudflared tunnel create easytalk
cloudflared tunnel route dns easytalk chat.yourdomain.com   # needs a domain, or use Cloudflare's free trycloudflare.com quick tunnels for testing
cloudflared tunnel run --url http://localhost:5000 easytalk
```
The tradeoff: it's only reachable while your PC and the tunnel are running —
fine for a college project or personal use, not for something that needs
99.9% uptime.

Either way, MongoDB is just `mongod --dbpath ./data` running locally — no
Atlas account, no cloud database bill, ever.

---

## 15. Mobile app — no Render, no Atlas, no app store required

Two levels, from zero effort to a real installable app:

### Level 1 — Install the PWA (already works, right now, free)

Section 13 above covers this — "Add to Home Screen" on Android/iPhone gives
you a real app icon, full-screen launch, offline shell, and push
notifications, with zero extra build step. For most people this *is* the
mobile app. This works against whatever backend you set up in Section 14 —
Render/Atlas were never involved.

### Level 2 — a real installable `.apk` via Capacitor (free, self-built)

The project already has Capacitor wired in (`frontend/package.json`,
`frontend/capacitor.config.ts`) — it wraps the exact same web app into a
native Android shell. Building the actual `.apk` needs **Android Studio**
running on your own machine (free download, no cloud build service, no
Play Store account required to just install it on your own phone):

1. Set your backend's public address in `frontend/.env`:
   ```
   VITE_API_URL=https://chat.yourdomain.com
   ```
   (A Capacitor app is a bundled, static app with no "same origin" to fall
   back to like a browser tab has — this has to point at a real, reachable
   backend from Section 14, whichever option you chose.)
2. Install Android Studio (free): https://developer.android.com/studio
3. From `frontend/`:
   ```bash
   npm install
   npm run cap:add     # one-time: generates the android/ project folder
   npm run cap:sync     # rebuilds the web app and copies it into the android/ project
   npm run cap:open     # opens the project in Android Studio
   ```
4. In Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
5. Grab the `.apk` from `frontend/android/app/build/outputs/apk/debug/`,
   transfer it to your phone (USB, email, Google Drive — anything), and
   install it (Android will warn about "unknown sources" for a non-Play-Store
   app — that's expected, tap through it).

That's a real installable app icon, no browser chrome, no Render, no Atlas —
just your own backend plus a free local build. Publishing to the Play Store
later is optional and separate (a one-time $25 Google developer fee), not
required to just install it on your own device.

---

## 16. Testing on your phone during development

Since the frontend can be served from the same origin as the backend
(Section 3), the simplest path is:
```bash
cd frontend && npm run build
cd ../backend && npm run dev
```
Then, if your phone and computer are on the same WiFi, open
`http://<your-computer's-LAN-IP>:5000` on your phone. If that WiFi blocks
device-to-device traffic (common on campus/office networks — "client
isolation"), use a free tunnel instead:
```bash
ngrok http 5000
```
and open the printed `https://...ngrok-free.app` URL on your phone.
