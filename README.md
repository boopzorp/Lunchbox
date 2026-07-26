# 🍱 Lunchbox — Your Mindful Remembrance Vault

> *"Don't forget to take your Lunchbox!"*  
> Named after the emotion of parents reminding us not to leave our lunchboxes behind, **Lunchbox** is a minimal, playful, and legible web application designed to hold your thoughts, action items, watchlists, and books so you never have to carry it all in your head.

---

## ✨ Features Built-In

### 1. 📋 Bento Remembrance Notebooks
Organize whatever you want to remember into color-coded **Bento Compartments**:
- **Daily Tasks & Action Items:** Priority badges, due dates, and extra notes.
- **Movies & TV Watchlist:** Unwind without spending 45 minutes scrolling for what to watch.
- **Books to Read:** Track your reading progress and favorite quotes.
- **Sparks & Ideas:** Capture random bursts of inspiration before they vanish.
- **Packing & Grocery Checklists:** Never leave home without your keys, wallet, or oat milk.
- *Customizable:* Create unlimited new notebooks with custom emojis and bento color themes!

### 2. 📌 Sticky Notifications (The 5-Minute Mindful Lock)
Why do we forget things when we open a reminder app? Because we close it after 5 seconds!
- **The 5-Minute Rule:** When you open Lunchbox, a persistent **Sticky Banner** (and simulated OS Lock Screen Widget) appears at the top of your vault.
- **Mindful Engagement Timer:** To dismiss today's sticky reminder, you must spend at least **5 mindful minutes (`05:00`)** actively interacting with your notebooks.
- **Celebratory Unpacking:** When you reach 5 minutes, a celebratory pop animation unlocks the badge: *"🎉 Lunchbox Packed & Remembered for today!"*
- **Lock Screen Simulation:** Click `📱 View Lock Screen` to preview how this sticky reminder stays pinned on an OS home screen widget!

### 3. 🦉 Recurring App Notifications (Duolingo-Style Parent Engine)
Inspired by loving parents and the Duolingo owl, **Pippy the Lunchbox Buddy** checks in throughout the day:
- **Playful Guilt-Trips & Nudges:** *"These tasks won't check themselves off... made you look!"*, *"Did you eat your lunch? And did you check off that urgent PR review?"*
- **Custom Schedules:** Choose between Every 30 Minutes, Hourly Check-ins, or Daily Summaries.
- **Web Push Notifications:** Requests browser notification permission to ping your desktop even when switching tabs.
- **Playful Audio Effects:** Includes toggleable crisp Web Audio API sound effects (lunchbox snap chime, checkbox completion pops, alert dings).

### 4. 🧠 Minimal AI Assistant ("Pippy / Mama Bento")
An intelligent, conversational buddy embedded right in your sidebar and slide-over drawer:
- **Deeply Personalized:** Pippy *reads all the items across your active notebooks* to give you tailored recommendations.
- **Smart Queries:**
  - *"What movie should I watch tonight?"* → Recommends from your Movies Watchlist based on priority and notes.
  - *"What is my #1 urgent priority?"* → Scans due dates and high-priority tags across all notebooks.
  - *"Quiz me on my notes!"* → Tests your memory on your own saved notes so you don't forget!
  - *"Summarize my day"* → Generates a comprehensive status report of your completed vs. pending items.
- **Dual AI Engine:** Works instantly out-of-the-box with a zero-latency built-in neural heuristics engine, OR paste your **Gemini API Key** in Settings for live cloud LLM reasoning!

---

## 🎨 Design Aesthetics
- **Minimal, Plain, Playful, but Legible:** Crafted with warm off-white bento cards (`#FAF8F5`) in Light Mode, and sleek charcoal obsidian (`#121418`) in Dark Mode.
- **Modern Web Standards:** Employs the latest CSS `@starting-style` and `transition-behavior: allow-discrete` rules for buttery-smooth top-layer dialogs and popover animations.
- **Zero-Build Overhead:** Pure, lightning-fast HTML5, CSS3, and ES6 JavaScript. No bulky frameworks or compilation steps required.

---

## 🚀 How to Run Locally

You can open `index.html` directly in any modern browser, or start a local development server:

```bash
# Using npm script (requires Node.js / npx)
npm run dev

# Or simply serve using npx directly:
npx -y serve@latest . -p 3000
```

---

## 🔒 Security & Firebase Setup

Lunchbox is configured for **100% safe public GitHub publishing**:
- **Zero Hardcoded Secrets:** Default project files contain no live API keys or credentials.
- **Local Vault Mode:** Runs out-of-the-box in local offline mode storing data safely in `localStorage`.
- **Cloud Database Integration:** To link your personal Firebase Firestore project:
  1. Open the app and click **Account / Auth** -> **Connect Firebase DB** (or edit `js/firebase-config.js`).
  2. Paste your web app parameters (`apiKey`, `projectId`, `authDomain`, `storageBucket`).
- **Strict Firestore Rules:** Pre-configured `firestore.rules` enforces strict user data isolation so authenticated users can only access their own document (`request.auth.uid == userId`).

---

## 🎒 Quick Tips
1. Use **Ctrl+K** (or Cmd+K on Mac) to instantly jump to the global search bar.
2. Click **🔔 Test Duolingo Nudge** in the bottom-left sidebar to simulate an instant animated popup reminder and audio chime!
3. Click **📱 View Lock Screen** inside the top sticky banner to see your persistent widget simulation.
4. Try checking off a task to hear the crisp checkbox pop sound!
