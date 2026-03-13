# Netlify Environment Variable Setup — Visual Guide

## ⚠️ CRITICAL: You Must Do This For Website To Work

The website code is ready. But it needs ONE environment variable in Netlify to function.

---

## What is This Variable?

- **Name:** `NEXT_PUBLIC_API_URL`
- **Value:** `https://f1-data-hub-kfhe.onrender.com`
- **Purpose:** Tells frontend where the backend server is located

**Without this:** Website gets stuck loading forever. ❌  
**With this:** Website works perfectly. ✅

---

## Step-by-Step Guide

### Step 1: Open Netlify Dashboard

1. Go to: https://app.netlify.com/
2. Login with your email/GitHub account
3. You should see your sites listed

### Step 2: Select Your F1 Data Hub Site

Look for the site named: **f1datahub**

Click on it to open the site dashboard.

```
Netlify Dashboard
├─ Sites
│  └─ f1datahub  ← Click here
```

### Step 3: Go to Site Settings

On the left sidebar, you'll see a menu. Look for **Site settings** or **Build & deploy**.

**Path:** Left sidebar → **Site settings** (or **Build & deploy**)

```
Left Sidebar Menu:
├─ Overview
├─ Site settings     ← Click here
├─ Build & deploy
├─ Deploys
└─ ...
```

Click **Site settings**.

### Step 4: Find Environment Variables

In Site settings, find the section for environment variables.

**Look for one of these:**
- **Environment variables** (exact name)
- **Environment** section
- **Build & deploy** → **Environment**

Different Netlify UI versions may have slightly different names.

### Step 5: Add the Variable

Click a button like:
- **"Add variable"**
- **"New variable"**
- **"Edit variables"**

A form will appear with two fields:

```
┌─────────────────────────────────────────┐
│ Environment Variable Form               │
├─────────────────────────────────────────┤
│ Name:  [___________________________]     │
│ Value: [___________________________]     │
│                                         │
│ [Save] [Cancel]                         │
└─────────────────────────────────────────┘
```

### Step 6: Enter the Variable

**In the "Name" field, type exactly:**
```
NEXT_PUBLIC_API_URL
```

**In the "Value" field, type exactly:**
```
https://f1-data-hub-kfhe.onrender.com
```

⚠️ **IMPORTANT:**
- No spaces
- No quotes
- No trailing slash at the end
- Exact spelling and capitalization

### Step 7: Save

Click **Save** or **Create** button.

You may be asked to confirm — click **Yes** or **OK**.

---

## Verification: Did It Work?

### Check 1: Environment Variable Appears in List

After saving, the variable should appear in your environment variables list:

```
NEXT_PUBLIC_API_URL = https://f1-data-hub-kfhe.onrender.com
```

If you see it listed → ✅ Success!

### Check 2: Netlify Auto-Rebuilds (Wait 1-2 minutes)

After setting the variable, Netlify automatically rebuilds your site.

Watch for:
1. Top of dashboard: Deploy status changes
2. New build starts (you might see a progress bar)
3. After 1-2 minutes: Status shows "Published" (green checkmark)

### Check 3: Visit Your Website

1. Open: https://f1datahub.netlify.app/
2. Page should load (not be blank)
3. You should see:
   - "F1 Analytics" title
   - Race schedule and standings data
   - No "Loading..." spinner indefinitely

### Check 4: Verify API Connections (Technical)

1. Open the website: https://f1datahub.netlify.app/
2. Press **F12** to open Developer Tools
3. Click the **Network** tab
4. Click any button that loads data
5. Look at the network requests

You should see requests like:
```
GET https://f1-data-hub-kfhe.onrender.com/api/schedule/2024
Status: 200
Response: JSON with race data
```

If you see this → ✅ Perfect! API is working!

---

## Common Mistakes (Avoid These!)

| Mistake | What Happens | Fix |
|---------|--------------|-----|
| Trailing slash: `https://...com/` | URL becomes malformed | Remove the `/` at end |
| Extra spaces: ` https://...com ` | URL doesn't match | Remove spaces |
| Wrong URL: `localhost:8000` | Requests go to your computer | Use Render URL given above |
| Forgot to save | Variable doesn't exist | Click Save/Create button |
| Wrong variable name: `API_URL` | Frontend can't find it | Use exact name: `NEXT_PUBLIC_API_URL` |
| Skipped this step entirely | Website stuck loading | Follow this guide! |

---

## What Happens Behind The Scenes

```
1. You set: NEXT_PUBLIC_API_URL = "https://f1-data-hub-kfhe.onrender.com"
   ↓
2. Netlify rebuilds site with this variable available
   ↓
3. During build: npm run build gets access to this variable
   ↓
4. Frontend code can now use: process.env.NEXT_PUBLIC_API_URL
   ↓
5. BASE = "https://f1-data-hub-kfhe.onrender.com"
   ↓
6. All API calls go to the correct backend
   ↓
7. Website works! ✅
```

---

## Screenshots (Text Description)

### Your Netlify Dashboard Should Look Like:

```
Site Settings → Environment Variables
┌────────────────────────────────────────────────┐
│ Environment Variables                          │
├────────────────────────────────────────────────┤
│ NEXT_PUBLIC_API_URL                            │
│ Value: https://f1-data-hub-kfhe.onrender.com   │
│ [X] (delete button)                            │
└────────────────────────────────────────────────┘
(If you see this, everything is set up correctly!)
```

### Your Deploy History Should Show:

```
Latest Deploy
┌────────────────────────────────────────────────┐
│ Status: Published ✅                           │
│ Branch: main                                   │
│ Commit: Fix deployment...                      │
│ Deployed: just now by Netlify                  │
│ Publish directory: out ← Important!            │
│ Build command: npm run build                   │
│                                                │
│ Environment variables:                         │
│ ✅ NEXT_PUBLIC_API_URL                         │
└────────────────────────────────────────────────┘
```

---

## Timing

After you save the environment variable:

| What | Time |
|------|------|
| You set variable | Now |
| Netlify detects change | ~10 seconds |
| Build starts | ~20 seconds |
| npm run build | ~30-45 seconds |
| Files deployed to CDN | ~1-2 minutes |
| **Total time: 1-3 minutes** | |

So wait 2-3 minutes after setting the variable, then test the website.

---

## Testing Checklist

After setting the environment variable and waiting 2-3 minutes:

- [ ] Website loads (https://f1datahub.netlify.app/)
- [ ] Page shows "F1 Analytics" title
- [ ] Dashboard displays race schedule (not "Loading...")
- [ ] Standings show driver points
- [ ] No error messages in browser console
- [ ] Network tab shows requests to `f1-data-hub-kfhe.onrender.com`
- [ ] Clicking "Telemetry" loads data
- [ ] Clicking "Track" loads GPS map
- [ ] Page is interactive and responsive

If all above are ✅ → **Deployment successful!** 🎉

---

## Need Help?

### If still stuck "Loading...":

1. **Check Netlify deploy log:**
   - Netlify dashboard → Deploys → Latest deploy → View deploy log
   - Look for any error messages

2. **Verify variable was saved:**
   - Website settings → Environment variables
   - Confirm `NEXT_PUBLIC_API_URL` is there

3. **Force a new deploy:**
   - Deploys → Trigger deploy → Deploy site

4. **Check backend is awake:**
   - Open: `https://f1-data-hub-kfhe.onrender.com/health`
   - May take 30 seconds if sleeping

5. **Open DevTools Network tab:**
   - F12 → Network tab
   - Look at what requests are made
   - Are they going to the right URL?

---

## Quick Reference

### Environment Variable Details

```
Name:  NEXT_PUBLIC_API_URL
Value: https://f1-data-hub-kfhe.onrender.com
Scope: All environments (Production, Preview, etc.)
Type:  Plain text (not secret)
```

### Location in Netlify

```
https://app.netlify.com/
  → Your site (f1datahub)
    → Site settings
      → Environment variables
        → Add or Edit NEXT_PUBLIC_API_URL
```

### Test URLs

- **Frontend:** https://f1datahub.netlify.app/
- **Backend Health:** https://f1-data-hub-kfhe.onrender.com/health
- **Backend API Docs:** https://f1-data-hub-kfhe.onrender.com/docs
- **Sample API Call:** https://f1-data-hub-kfhe.onrender.com/api/schedule/2024

---

## One More Thing: How to Know It's Really Working

Open your website and check the browser console (F12 → Console):

### Bad (Variable not set):
```
❌ FATAL: NEXT_PUBLIC_API_URL not set. Frontend cannot reach backend API.
```

### Good (Everything working):
```
(No error message about NEXT_PUBLIC_API_URL)
✅ API calls visible in Network tab going to correct backend
✅ Data displaying on pages
```

---

**That's it! Just one variable, and your website works. You've got this! 🚀**
