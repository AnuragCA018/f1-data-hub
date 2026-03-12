# F1 Data Hub — Production Deployment Guide

Full end-to-end guide to deploy the frontend on **Netlify** and the backend on **Render** (free tier).

---

## Architecture Overview

```
Browser ──► Netlify (Next.js frontend)
                │
                │  /api/* rewrites
                ▼
           Render (FastAPI backend)
                │
                │  FastF1 + SQLite
                ▼
           Persistent Disk / Cache
```

The frontend proxies all `/api/*` requests to the backend — no CORS issues in production and the backend URL is never exposed to the browser.

---

## Part 1 — Deploy the Backend on Render

### 1.1 Push the repository to GitHub

If not already done:

```bash
git init
git add .
git commit -m "initial commit"
gh repo create f1-data-hub --private --push --source .
# or: git remote add origin https://github.com/YOUR_USER/f1-data-hub.git && git push -u origin main
```

### 1.2 Create a new Web Service on Render

1. Go to [https://render.com](https://render.com) and sign in.
2. Click **New → Web Service**.
3. Connect your GitHub account and select the `f1-data-hub` repository.
4. Fill in the settings:

| Field | Value |
|---|---|
| **Name** | `f1-data-hub-backend` |
| **Region** | Frankfurt / Oregon (your choice) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | Free |

### 1.3 Set backend environment variables on Render

In **Environment → Environment Variables**, add:

| Key | Value |
|---|---|
| `ALLOWED_ORIGINS` | `https://your-app.netlify.app` *(fill in after Netlify deploy)* |
| `FASTF1_CACHE_DIR` | `/tmp/fastf1_cache` |
| `ENVIRONMENT` | `production` |

> **Note:** The `PORT` variable is set automatically by Render — do not override it.

### 1.4 Add a Persistent Disk (recommended)

Without persistent storage, the FastF1 cache and SQLite database reset on every deploy. To keep them:

1. In your Render service dashboard go to **Disks → Add Disk**.
2. Set **Mount Path** to `/data`.
3. Update the environment variable: `FASTF1_CACHE_DIR` → `/data/fastf1_cache`.
4. The SQLite path in `main.py` / `database/connection.py` defaults to `f1_data.db` (relative to `backend/`). On Render with a disk it will persist automatically because the working directory is inside the service — or point it to `/data/f1_data.db` by setting `DB_PATH=/data/f1_data.db` if your connection code reads that env var.

> Free tier does not include a persistent disk. Without it the cache re-downloads on every cold start (slower first requests), but the app still works correctly.

### 1.5 Verify the backend

After the first deploy finishes (2–4 minutes):

1. Copy the service URL, e.g. `https://f1-data-hub-backend.onrender.com`.
2. Open `https://f1-data-hub-backend.onrender.com/health` — should return `{"status":"ok"}`.
3. Open `https://f1-data-hub-backend.onrender.com/docs` — interactive API explorer.

---

## Part 2 — Deploy the Frontend on Netlify

### 2.1 Create a new site on Netlify

1. Go to [https://app.netlify.com](https://app.netlify.com) and sign in.
2. Click **Add new site → Import an existing project**.
3. Pick **GitHub** and select the `f1-data-hub` repository.
4. Netlify auto-detects `netlify.toml` at the root — the build settings are filled in automatically:

| Field | Auto-filled from netlify.toml |
|---|---|
| **Base directory** | `frontend` |
| **Build command** | `npm run build` |
| **Publish directory** | `frontend/.next` |

5. Click **Deploy site** (it will fail on the first try without env vars — that's fine, continue to 2.2).

### 2.2 Set frontend environment variables

In **Site settings → Environment variables**, add:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | *(leave empty — rewrites handle routing)* |
| `BACKEND_URL` | `https://f1-data-hub-backend.onrender.com` |

Then go to **Deploys → Trigger deploy → Deploy site** to redeploy with the new variables.

### 2.3 Verify the frontend

After deploy (1–3 minutes):

1. Open your Netlify URL, e.g. `https://f1-data-hub.netlify.app`.
2. The dashboard should load and the standings/calendar cards should populate.
3. Check browser DevTools → Network: all `/api/*` requests should return 200.

### 2.4 Update backend CORS

Now that you have your Netlify URL, go back to Render and update:

| Key | Value |
|---|---|
| `ALLOWED_ORIGINS` | `https://f1-data-hub.netlify.app` |

Render will auto-redeploy. You can add a custom domain here too, e.g. `https://f1datahub.com`.

### 2.5 Custom domain (optional)

In Netlify: **Domain management → Add custom domain**.  
In Render: **Settings → Custom Domains**.  
Update `ALLOWED_ORIGINS` to your custom domain after DNS propagates.

---

## Part 3 — Train the AI Prediction Model

The race prediction model must be trained before predictions are shown. This is a one-time step that runs on Render.

### Option A — Train via Render Shell (recommended)

1. In your Render service dashboard, click **Shell**.
2. Run:

```bash
python scripts/build_dataset.py --start 2020 --end 2024
python scripts/train_model.py
```

This downloads FastF1 data (~30 min) and saves the model to `backend/models/`.

3. Restart the service: **Manual Deploy → Deploy latest commit**.

### Option B — Train locally and commit the model

```bash
cd backend
.\venv\Scripts\Activate.ps1        # Windows
# source venv/bin/activate          # Linux/macOS

python scripts/build_dataset.py --start 2020 --end 2024
python scripts/train_model.py
```

Then commit and push the generated `models/winner_predictor.joblib` and `models/model_meta.json`:

```bash
# In .gitignore, make sure backend/models/ is NOT ignored
git add backend/models/
git commit -m "add trained prediction model"
git push
```

Render will automatically redeploy with the model included.

---

## Part 4 — Environment Variable Reference

### Frontend (`frontend/.env.example`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | Full backend URL for direct client calls. Leave empty to use the `/api/*` rewrite proxy (recommended). |
| `BACKEND_URL` | Yes (prod) | Backend URL used by Next.js rewrites at build time. Set to your Render URL. |

### Backend (`backend/.env.example`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `ALLOWED_ORIGINS` | Yes (prod) | `http://localhost:3000` | Comma-separated list of allowed CORS origins. |
| `FASTF1_CACHE_DIR` | No | `cache/` | Path where FastF1 caches downloaded session data. |
| `PORT` | Auto | `8000` | Set automatically by Render / Railway / Fly.io. |
| `ENVIRONMENT` | No | `development` | Set to `production` on hosting platforms. |

---

## Part 5 — Deployment Checklist

### Before deploying

- [ ] Code pushed to GitHub
- [ ] `frontend/.env.example` reviewed — copy values to Netlify env vars
- [ ] `backend/.env.example` reviewed — copy values to Render env vars
- [ ] `netlify.toml` present at project root
- [ ] `backend/Procfile` present

### After deploying

- [ ] Backend health check: `GET /health` → `{"status":"ok"}`
- [ ] Frontend loads without 500 errors
- [ ] Standings card on dashboard populates
- [ ] `/api/*` requests shown in DevTools return 200 (not CORS errors)
- [ ] Updated `ALLOWED_ORIGINS` on Render with the live Netlify URL
- [ ] (Optional) Prediction model trained and backend redeployed

---

## Part 6 — Troubleshooting

### "Failed to fetch" / CORS error in browser

- `ALLOWED_ORIGINS` on Render does not include your Netlify URL.
- Check there are no trailing slashes in the origin value.
- Re-deploy Render after updating the env var.

### Netlify build fails

- Check that `BACKEND_URL` is set in Netlify env vars (required for rewrites to compile).
- Ensure `netlify.toml` is at the **repository root**, not inside `frontend/`.
- Check `Node.js` version in Netlify is 20 (set in `netlify.toml` already).

### Render deploy fails

- Check Build Command: `pip install -r requirements.txt`
- Python version: set `PYTHON_VERSION=3.11` in Render env vars if needed.
- Logs: Render **Logs** tab shows pip install and uvicorn startup output.

### Render free tier cold starts

Render free services sleep after 15 minutes of inactivity. The first request after sleep takes ~30 seconds. Upgrade to a paid instance or use [UptimeRobot](https://uptimerobot.com) to ping `/health` every 5 minutes.

### AI Predictions show "Model not trained yet"

The model file is missing. Train it via Render Shell (Part 3 above) or commit the model files to the repository.

### Slow first data load

FastF1 downloads session data from the F1 servers on first access. With a Render persistent disk (`/data`) the cache persists across deploys. Without it, data re-downloads after each deploy.

---

## Quick Reference

```
Frontend:  https://your-app.netlify.app
Backend:   https://f1-data-hub-backend.onrender.com
API Docs:  https://f1-data-hub-backend.onrender.com/docs
Health:    https://f1-data-hub-backend.onrender.com/health
```

| Platform | Free Tier Limits |
|---|---|
| Netlify | 100 GB bandwidth / month, 300 build min / month |
| Render | 750 hours / month, sleeps after 15 min idle, 0.1 CPU / 512 MB RAM |
