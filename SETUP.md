# 🏈 Gridiron Stats — Setup & Deployment Guide

A full-stack player stats tracker for your U16 American Football team.

---

## What's included

| Layer | Tech |
|---|---|
| Frontend | React + Vite (static site) |
| Backend | Node.js + Express (REST API) |
| Database | PostgreSQL (auto-provisioned by Render) |
| Auth | Auth0 (Google, Microsoft, Apple, Email/Password) |
| Hosting | Render (free tier) |

---

## Step 1 — Set up Auth0 (15 min)

Auth0 handles all logins for free. Go to [auth0.com](https://auth0.com) and create a free account.

### 1a — Create an API (for the backend)

1. Go to **Applications → APIs → Create API**
2. **Name:** `Gridiron Stats API`
3. **Identifier (Audience):** `https://gridiron-stats-api` ← copy this exactly
4. Click **Create**

### 1b — Create a Single Page Application (for the frontend)

1. Go to **Applications → Applications → Create Application**
2. **Name:** `Gridiron Stats`
3. **Type:** Single Page Application
4. Click **Create**
5. In the **Settings** tab, note your **Domain** and **Client ID**
6. Scroll to **Allowed Callback URLs** and add:
   ```
   http://localhost:5173, https://your-frontend.onrender.com
   ```
   (you'll update the Render URL after deployment)
7. Do the same for **Allowed Logout URLs** and **Allowed Web Origins**
8. Save changes

### 1c — Enable social connections

1. Go to **Authentication → Social**
2. Enable **Google**, **Microsoft**, and **Apple**
   - Each has a "Try" button — for development you can use Auth0's dev keys
   - For production, you'll need to create OAuth apps on each platform (Google Cloud Console, Azure, Apple Developer). Auth0 has step-by-step guides for each.

### 1d — Add a custom claim action (so backend gets the user's email)

1. Go to **Actions → Library → Build Custom**
2. Name: `Add user info to token`
3. Paste this code:
   ```javascript
   exports.onExecutePostLogin = async (event, api) => {
     const namespace = 'https://gridiron-stats-api';
     api.accessToken.setCustomClaim(`${namespace}/email`, event.user.email);
     api.accessToken.setCustomClaim(`${namespace}/name`, event.user.name);
     api.accessToken.setCustomClaim(`${namespace}/picture`, event.user.picture);
   };
   ```
4. Deploy → then go to **Actions → Flows → Login** and drag your action in

---

## Step 2 — Push to GitHub

```bash
cd gridiron-stats
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gridiron-stats.git
git push -u origin main
```

---

## Step 3 — Deploy to Render

### Option A — Using render.yaml (recommended)

1. Go to [render.com](https://render.com) → **New → Blueprint**
2. Connect your GitHub repo
3. Render will detect `render.yaml` and create all three services automatically
4. You'll be prompted to fill in the env vars marked `sync: false` (see below)

### Option B — Manual setup

#### Backend (Web Service)
- **New → Web Service** → connect repo
- **Root Directory:** `backend`
- **Build:** `npm install`
- **Start:** `npm start`
- Add environment variables (see below)

#### Database
- **New → PostgreSQL** → free tier, name it `gridiron-db`
- Copy the **Internal Database URL** → paste as `DATABASE_URL` in your backend service

#### Frontend (Static Site)
- **New → Static Site** → connect repo
- **Root Directory:** `frontend`
- **Build:** `npm install && npm run build`
- **Publish:** `dist`
- Add a Rewrite Rule: `/*` → `/index.html`

---

## Step 4 — Set environment variables in Render

### Backend service
| Variable | Value |
|---|---|
| `DATABASE_URL` | Auto-filled if using Blueprint, otherwise paste from Render DB |
| `AUTH0_DOMAIN` | e.g. `your-tenant.eu.auth0.com` |
| `AUTH0_AUDIENCE` | `https://gridiron-stats-api` |
| `FRONTEND_URL` | `https://gridiron-frontend.onrender.com` |
| `NODE_ENV` | `production` |

### Frontend static site
| Variable | Value |
|---|---|
| `VITE_AUTH0_DOMAIN` | e.g. `your-tenant.eu.auth0.com` |
| `VITE_AUTH0_CLIENT_ID` | From Auth0 SPA application settings |
| `VITE_AUTH0_AUDIENCE` | `https://gridiron-stats-api` |
| `VITE_API_URL` | `https://gridiron-backend.onrender.com` |

---

## Step 5 — Update Auth0 callback URLs

Once you have your frontend Render URL, go back to Auth0 → your SPA app → Settings and add the real URL to:
- Allowed Callback URLs
- Allowed Logout URLs
- Allowed Web Origins

---

## Running locally

```bash
# Install all dependencies
npm run install:all

# Create local env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both .env files with your Auth0 details and local DB

# Start backend (port 3001)
npm run dev:backend

# Start frontend (port 5173)
npm run dev:frontend
```

---

## Feature overview

### Teams
- Create multiple teams (e.g. different seasons or squads)
- Win/loss record tracked automatically

### Players
- Add players with name, jersey number, position
- Click any player to view their season game log and totals

### Games
- Schedule games with opponent, date, time, location
- Mark home/away/neutral
- Update score during or after the game
- Status: Scheduled / Live / Completed

### Stat logging (during a game)
Tap any player in the roster panel, then pick a stat:

**Offense:** Touchdown, Receiving Yards, Rushing Yards, Passing Yards, Reception, 2-Point Conversion

**Defense:** Tackle, Tackle Assist, TFL, Sack, Interception, PBU, Fumble Recovery, Forced Fumble

**Special Teams:** Kick Return Yards, Punt Return Yards, PAT Kick, Field Goal

### Leaderboard
Season-long leaderboard for every stat category, filterable by stat type.

---

## Notes

- The Render free tier will spin down the backend after 15 min of inactivity. First request after idle takes ~30s. Upgrading to the $7/mo Starter plan keeps it always-on.
- The free PostgreSQL database on Render expires after 90 days. You can export and re-import, or upgrade to a paid plan for persistence.
- Auth0 free tier supports 7,500 active users per month — more than enough.
