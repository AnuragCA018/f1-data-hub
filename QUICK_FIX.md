# QUICK FIX — 2-Minute Deployment Solution

## The Problem ❌
Website loads but data is stuck loading forever.

## The Root Cause 🔍
Frontend can't find backend API because environment variable is missing.

## The Solution ✅
Set ONE environment variable in Netlify. That's it.

---

## What To Do RIGHT NOW (2 minutes)

### 1️⃣ Go to Netlify Dashboard
```
https://app.netlify.com/ → Your site (f1datahub)
```

### 2️⃣ Open Site Settings
```
Left sidebar → Site settings → Environment variables
```

### 3️⃣ Add This Variable
```
Name:  NEXT_PUBLIC_API_URL
Value: https://f1-data-hub-kfhe.onrender.com
```

### 4️⃣ Click Save
Site auto-rebuilds (1-2 minutes)

### 5️⃣ Test
Open: https://f1datahub.netlify.app/

✅ Data should now load!

---

## What Fixed?

| File | Change |
|------|--------|
| netlify.toml | `publish: ".next"` → `"out"` |
| frontend/.env.example | Added `NEXT_PUBLIC_API_URL` documentation |
| frontend/services/api.ts | Added error check for missing env var |
| Git | Committed and pushed all changes |

---

## Why This Works

```
Before: Frontend tries to call /api/... 
        Netlify says 404 (no such route on static site)
        Data never loads ❌

After:  Frontend calls https://f1-data-hub-kfhe.onrender.com/api/... 
        Backend responds with data ✅
        Website works!
```

---

## Expected Results

After setting the variable and waiting 2 minutes:

✅ Website loads (not stuck loading)
✅ Race schedule displays
✅ Standings show by default
✅ Telemetry page works
✅ Track map displays
✅ All pages functional

---

## If Still Broken

1. **Check Netlify deploy succeeded:**
   - Netlify dashboard → Deploys → Latest status should be "Published"

2. **Verify variable was saved:**
   - Netlify → Site settings → Environment variables
   - Should see `NEXT_PUBLIC_API_URL` in the list

3. **Force rebuild:**
   - Netlify → Deploys → "Trigger deploy"

4. **Check backend is awake:**
   - Open: https://f1-data-hub-kfhe.onrender.com/health
   - Free tier sleeps after 15 min (takes 30 sec to wake)

---

## Summary

| What | Done? |
|------|-------|
| Fix netlify.toml | ✅ Committed |
| Fix frontend config | ✅ Committed |
| Push to GitHub | ✅ Done |
| Set Netlify env var | 🔴 **YOU DO THIS** |

**Status:** 95% done. Just need you to set ONE environment variable.

Time to live: **2 minutes after you complete step 3 above.**
