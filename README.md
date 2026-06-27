# Sous-Chef AI — Cooking To-Do List Micro-App

Welcome to **Sous-Chef AI**, an intelligent, adaptive, and highly empathetic lifestyle agent and cooking assistant. This micro-app helps you manage your meal planning, grocery lists, and cooking tasks based on your schedule, energy level, and daily context.

The application is built using **HTML, Vanilla CSS, and JavaScript** conforming to the PromptWars Guardrails, prioritizing code quality, efficiency, security, and responsive glassmorphic aesthetics.

---

## 🚀 How to Run the App

Since this is a client-side Single Page Application (SPA), you can run it instantly using any local server.

### Option 1: Python HTTP Server (Recommended)
Run the following command in this directory:
```bash
python -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 2: Live Server (VS Code Extension)
Right-click on `index.html` and select **Open with Live Server**.

### Option 3: Double-click index.html
You can open `index.html` directly in your browser. However, **Live Gemini AI mode** might require an HTTP origin due to browser security restrictions on CORS/fetch, so a local server is highly recommended for full API connectivity.

---

## 🛠️ Operating Modes

### 1. Interactive Demo Mode (Offline)
No API key required! Perfect for rapid evaluation. Choose from three highly curated scenarios:
- **High Fatigue**: Tailored for exhausting days (back-to-back meetings), generating quick sheet-pan/one-pot meals.
- **Late Commute**: Optimized for late commutes. Promotes slow-cooker set-and-forget meals or morning preparation.
- **High-Stakes Date Night**: Schedules an **Invisible Prep** timeline (splitting preparation into 3-minute chunks at lunch) to make the final dinner effortless.

### 2. Live Gemini AI Mode
Provide your own **Gemini API Key** in the connection panel. Alternatively, you can paste it into the local [.env](file:///d:/Prompt%20Wars/Warm%20Up%20Challenge/.env) file under `GEMINI_API_KEY`, which will be loaded automatically on application start! The app sends your custom schedule directly to the Gemini API (`gemini-2.5-flash`) using JSON schemas to dynamically build custom meal cards, grocery aisles, gamified task boards, and budget assessments on-the-fly!

---

## 🌟 Premium Features

- **Energy ROI Pitch**: Behavioral psychology prompts that highlight why cooking is faster, healthier, and cheaper than food delivery.
- **Just 5 Minutes Rule**: Prompts to lower the entry barrier (e.g., *"Just chop the broccoli, then decide if you want to quit"*).
- **Gamified Task Phrasing**: Turns boring instructions into milestones (e.g., *"Attack the Broccoli! Splinter the crown into bite-sized florets"*).
- **Clean-As-You-Go Prompts**: Embedded reminders to wash prep tools and clean surfaces during simmer/roast times.
- **Emergency Panic Button**: A prominent, pulsing panic button that instantly swaps the dinner plan for a **10-Minute Pivot Meal** (with its own checklist) if you hit a wall.
- **Dynamic Motivational Styles**: Toggle between **The Hype Bestie**, **The Stoic Realist**, and **The Pocket Mom** to change the tone of all text on the fly.
- **Modern Glassmorphism Design**: Glow-filtered radial gradient backgrounds, high contrast dark theme, and fluid micro-interactions.

---

## 🔒 Security & Guardrails Audit
- **Zero Secrets Stored**: No API keys are hardcoded in the codebase. All keys are input by the user and held in browser-only `localStorage`.
- **Pure Client-Side**: No backend, keeping data completely local to the user's browser.
- **Performance Optimized**: Zero external framework dependencies, meaning sub-millisecond local rendering and minimal memory overhead.
