# F1 Data Hub — Deployment Checklist & Setup Guide

## 🚀 Quick Start: Get the Website Working

This checklist guides you through deploying the F1 Data Hub to production (Netlify + Render).

---

## Phase 1: Prerequisites ✅

Before deploying, ensure:

- ✅ Backend deployed on **Render**: `https://f1-data-hub-kfhe.onrender.com`
  - API should respond to: `https://f1-data-hub-kfhe.onrender.com/`
  - Verify: Open `https://f1-data-hub-kfhe.onrender.com/health` in browser

- ✅ Frontend repo pushed to GitHub
  - All changes committed: `git add .`, `git commit`, `git push origin main`

- ✅ Netlify site created and connected to GitHub repo

---

## Phase 2: Fix Configuration Files ✅ (DONE)

### ✅ File 1: netlify.toml

**Status: FIXED**

```toml
[build]
  base    = "frontend"
  command = "npm run build"
  publish = "out"  # ← Was ".next", now "out" (correct static export folder)
```

**Why this matters:**
- Next.js static export writes files to `frontend/out/`
- `.next/` is only a development cache
- Netlify must publish the correct folder

### ✅ File 2: frontend/.env.example

**Status: FIXED**

```bash
# Now clearly documents that NEXT_PUBLIC_API_URL is REQUIRED for production
NEXT_PUBLIC_API_URL=https://f1-data-hub-kfhe.onrender.com
BACKEND_URL=http://localhost:8000
```

### ✅ File 3: frontend/services/api.ts

**Status: FIXED**

```typescript
// Now includes error check that warns if NEXT_PUBLIC_API_URL is not set
const BASE = process.env.NEXT_PUBLIC_API_URL || "";

if (!BASE) {
  console.error(
    "❌ FATAL: NEXT_PUBLIC_API_URL not set. Frontend cannot reach backend API."
  );
}
```

---

## Phase 3: Set Netlify Environment Variables 🔴 (YOUR ACTION REQUIRED)

### In Netlify Dashboard:

1. **Navigate to:** Your site → **Site settings** → **Environment variables**

2. **Add this variable:**

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://f1-data-hub-kfhe.onrender.com` |

3. **Save** and the site will auto-rebuild with the new environment variable

### Why This Variable Is Essential:

- **Static export + external API = environment variable required**
- Frontend cannot use rewrites (no server in static site)
- Must connect directly to backend via full URL
- Without this, all API requests fail (404 or timeout)

---

## Phase 4: Verify Build Output 🔴 (YOUR ACTION REQUIRED)

### Verify the `out/` folder exists locally:

```bash
cd frontend
npm run build
```

Expected output:
```
✅ Generated build folder: out/
✅ Contains: index.html, _next/, telemetry.html, track.html, etc.
✅ Ready for deployment
```

### Verify Netlify is building correctly:

1. **Go to Netlify Dashboard** → Your site
2. **Click "Deploy history"**
3. **Check the latest deploy:**
   - ✅ Build logs show: `Publish directory: out`
   - ✅ No errors about missing `NEXT_PUBLIC_API_URL`
   - ✅ Deploy status: "Published"

---

## Phase 5: Verify Render Backend is Ready 🔴 (YOUR ACTION REQUIRED)

### Check Backend Health:

Open in browser: `https://f1-data-hub-kfhe.onrender.com/health`

Expected response:
```json
{
  "status": "healthy",
  "cache_entries": 42
}
```

If you see error:
- Backend may be sleeping (free tier Render sleeps after 15 min)
- First request wakes it up (takes 10-30 seconds)
- Try again in 30 seconds

### Check API Documentation:

Open: `https://f1-data-hub-kfhe.onrender.com/docs`

You should see FastAPI Swagger UI with all endpoints listed.

---

## Phase 6: Backend CORS Configuration ✅ (VERIFIED)

**Status: Correctly configured**

Backend (`backend/main.py`) has CORS middleware enabled:

```python
ALLOWED_ORIGINS = [
    "https://f1datahub.netlify.app",  # ← Set via ALLOWED_ORIGINS env var on Render
    # ... other origins
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Verify on Render Dashboard:**

In your Render service settings, check **Environment** variables:
- `ALLOWED_ORIGINS` should equal your Netlify domain (https://f1datahub.netlify.app/)

If not set, backend blocks requests from frontend → CORS error.

---

## Phase 7: Test API Connectivity Using Browser DevTools 🔴 (YOUR ACTION REQUIRED)

### Step 1: Open your deployed site
- URL: `https://f1datahub.netlify.app/`

### Step 2: Open Browser DevTools
- Press **F12** or right-click → **Inspect**
- Go to **Network** tab

### Step 3: Trigger an API request
- Click any button that loads data (e.g., "Dashboard" home page)
- Watch the Network tab for requests

### Step 4: Verify the request
Look for a request like:
```
GET https://f1-data-hub-kfhe.onrender.com/api/schedule/2024
```

Verify:
- ✅ **Status:** 200 (success)
- ✅ **Response:** JSON data (not HTML error page)
- ✅ **URL:** Starts with `https://f1-data-hub-kfhe.onrender.com` (not empty or localhost)

### Step 5: Verify data appears on page
- ✅ Page should no longer be stuck in "Loading..."
- ✅ Race data, standings, etc. should display
- ✅ No error message in browser console

### Troubleshooting Network Requests:

| Issue | Cause | Solution |
|-------|-------|----------|
| Request goes to `/api/...` (empty base) | `NEXT_PUBLIC_API_URL` not set | Set it in Netlify env vars + rebuild |
| Status 404 | Netlify static site received request | Verify frontend is using `BASE = "https://..."` |
| Status 0 (blocked) or CORS error | Backend not allowing origin | Check `ALLOWED_ORIGINS` on Render |
| Takes 30-60 seconds | Render cold start + FastF1 download | Normal on first request after hibernation |
| Timeout after 120s | Request taking too long | Backend may be slow; wait 2 min and retry |

---

## Phase 8: Improve Frontend Error Handling ✅ (VERIFIED)

**Status: Error handling already implemented**

The frontend properly handles errors:

- ✅ **Homepage** (`app/page.tsx`): Shows friendly message if data fails
- ✅ **Telemetry** (`app/telemetry/page.tsx`): Shows error banner
- ✅ **Track** (`app/track/page.tsx`): Error display implemented
- ✅ **Qualifying** (`app/qualifying/page.tsx`): Error handling in place
- ✅ **Race** (`app/race/[year]/[race]/page.tsx`): Error states handled

**How errors show:**
- ✅ "Data for this season is not available yet" → Future seasons
- ✅ "Request timed out after 120s" → First load on Render cold start
- ✅ "API 500" → Backend error with details

---

## Phase 9: Verify Static Export ✅ (VERIFIED)

**Status: Correctly configured**

### What `output: "export"` does:

1. **Build time:** Generates static HTML files in `frontend/out/`
2. **No server:** Pure static site (CDN-friendly)
3. **API calls:** Must use `NEXT_PUBLIC_API_URL` (rewrites don't work)
4. **Deployment:** Netlify CDN serves files (no Node.js runtime)

### Verify locally:

```bash
cd frontend
npm run build

# Check output folder
ls -la out/

# Expected files:
#   index.html
#   telemetry.html
#   track.html
#   qualifying.html
#   race/
#   driver/
#   prediction.html
#   _next/
```

---

## 🎯 Final Deployment Checklist

Before declaring success, verify all items:

### Configuration ✅
- [x] `netlify.toml` has `publish = "out"`
- [x] `frontend/.env.example` documents `NEXT_PUBLIC_API_URL`
- [x] `frontend/services/api.ts` has error check for missing env var
- [x] Backend CORS allows Netlify domain

### Netlify Setup 🔴
- [ ] Netlify environment variable set: `NEXT_PUBLIC_API_URL=https://f1-data-hub-kfhe.onrender.com`
- [ ] Latest deploy shows `publish directory: out`
- [ ] Deploy status: "Published" (green checkmark)

### Backend Setup 🔴
- [ ] `https://f1-data-hub-kfhe.onrender.com/health` returns 200
- [ ] Backend env var `ALLOWED_ORIGINS` includes Netlify domain

### Verification Testing 🔴
- [ ] Open `https://f1datahub.netlify.app/` in browser
- [ ] Network tab shows request to `https://f1-data-hub-kfhe.onrender.com/api/schedule/...`
- [ ] Request returns status 200 with JSON data
- [ ] Page displays race schedule and standings (no "Loading..." stuck state)
- [ ] Click "Telemetry" → loads telemetry data without timeout
- [ ] Click "Track" → loads track position data
- [ ] Click "Qualifying" → loads qualifying data

### Performance Baseline 🔴
- [ ] First request takes 30-60 seconds (FastF1 download)
- [ ] Subsequent requests <2 seconds (cached)
- [ ] No 404 errors in Network tab
- [ ] No CORS errors in browser Console

---

## 📋 Troubleshooting Decision Tree

### Issue: "Loading..." never completes

**Diagnosis plan:**
1. Open DevTools → Network tab
2. Look at last request that started

**If request shows:**
- ❌ **No API requests at all** → Frontend not calling API (check console for errors)
- ❌ **Request to `/api/...`** → BASE is empty (NEXT_PUBLIC_API_URL not set)
- ❌ **Request to `localhost:8000`** → Wrong backend URL (should be Render)
- ✅ **Request to `f1-data-hub-kfhe.onrender.com`** but 0 status → CORS error
- ✅ **Request to `f1-data-hub-kfhe.onrender.com` with 200 status** → Data loaded! Check page display

---

### Issue: "CORS error" in browser console

**Cause:** Backend CORS middleware blocking request

**Solution:**
1. Verify Netlify domain is in `ALLOWED_ORIGINS` on Render
2. Should be: `ALLOWED_ORIGINS=https://f1datahub.netlify.app/`
3. If changed, restart Render service
4. Refresh browser

---

### Issue: "Request timed out after 120s"

**This is NORMAL on first load.** Here's why:

1. Render free tier sleeps (wakes up = 10-30 sec)
2. FastF1 downloads session data (30-60 sec)
3. Total = 40-90 seconds
4. If things are slow, could timeout at 120 sec

**Solution:**
- Wait 2 minutes
- Refresh page
- "Prewarm" will improve this (backend loads 2024 R1 on startup)

---

### Issue: "API 500" error

**This means backend received request but failed**

**Diagnosis:**
1. Check Render logs: Your service → **Logs**
2. Look for error details
3. Most common: FastF1 data unavailable (rare)

**Solution:**
- Try a different year/round
- Report issue if persistent

---

## 🔧 Quick Deploy Command

After making changes:

```bash
# From project root
cd frontend
npm install              # If dependencies changed
npm run build            # Generates out/ folder
git add .
git commit -m "Fix deployment config"
git push origin main      # Netlify auto-builds and deploys
```

Then wait 1-2 minutes for Netlify to:
1. Install dependencies
2. Build with `NEXT_PUBLIC_API_URL` from dashboard
3. Publish `out/` folder to CDN
4. Deploy live

---

## 📚 Reference Links

| Resource | Link |
|----------|------|
| **Frontend URL** | `https://f1datahub.netlify.app/` |
| **Backend URL** | `https://f1-data-hub-kfhe.onrender.com/` |
| **Backend API Docs** | `https://f1-data-hub-kfhe.onrender.com/docs` |
| **Netlify Env Vars** | Dashboard → Site settings → Environment variables |
| **Render Logs** | Dashboard → Your service → Logs |
| **Next.js Docs** | https://nextjs.org/docs/app/building-your-application/deploying/static-exports |

---

## ✨ Success Criteria

Your deployment is **working correctly** when:

1. ✅ `https://f1datahub.netlify.app/` loads dashboard
2. ✅ Race schedule and standings display (not stuck loading)
3. ✅ Telemetry page loads data (may take 60 sec on first request)
4. ✅ Track page displays GPS visualization
5. ✅ Qualifying page shows sector times
6. ✅ Network tab shows requests to `f1-data-hub-kfhe.onrender.com`
7. ✅ No error messages in browser console
8. ✅ No CORS errors
9. ✅ No "Request timed out" unless first request after Render sleep

**If all above are true: 🎉 Deployment successful!**

---

## 🆘 Still Broken? Debug Steps

1. **Check Netlify build log:**
   - Dashboard → Deploy history → Latest → View deploy log
   - Look for errors or warnings

2. **Check for `NEXT_PUBLIC_API_URL` in build:**
   - Should see: `Published directory: out`
   - Should NOT see: `Published directory: .next`

3. **Check Render logs:**
   - Your service → Logs
   - Should see: `Uvicorn running on 0.0.0.0:PORT`

4. **Test backend directly:**
   - Open: `https://f1-data-hub-kfhe.onrender.com/api/schedule/2024`
   - Should return JSON (not error page)

5. **Check browser console for errors:**
   - DevTools → Console → Filter: all
   - Look for red error messages
   - Copy full error text

6. **Test with network request:**
   - DevTools → Network → Reload page
   - Look at the failing request
   - Check: URL, Status, Response body

If still stuck, contact support with:
- Screenshot of Network tab
- Console error message
- Netlify deploy log extract
- Browser URL where issue occurs
