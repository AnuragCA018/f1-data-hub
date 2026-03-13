# Backend Performance Monitoring — Quick Reference

## View Cache Statistics (Measure Performance)

```bash
# Check current cache performance
curl https://your-backend.onrender.com/api/cache/stats
```

**What to look for:**
- `hit_rate_percent`: Should be >80% in production
- `cache_entries`: 8-20 is normal (number of cached sessions)  
- `total_hits`: Should be high (cache being reused)
- `total_misses`: Should be low (few fresh downloads)

---

## Manage Cache (Testing/Troubleshooting)

```bash
# Clear everything (session cache + API cache)
curl -X POST https://your-backend.onrender.com/api/cache/clear

# Clear only FastF1 session cache
curl -X POST https://your-backend.onrender.com/api/cache/clear-sessions-only

# Clear only API response cache
curl -X POST https://your-backend.onrender.com/api/cache/clear-api-only
```

---

## Test Performance

### Step 1: Make a Request (Warms Cache)
```bash
# This will load 2024 Round 1 Race data
curl "https://your-backend.onrender.com/api/telemetry/2024/1/VER?lap=1"

# First request: 45-90 seconds (watch the logs)
# Will see: ⏳ Cache MISS: Loading FastF1 session...
#           ✔ Loaded and cached...
```

### Step 2: Repeat Request (Hits Cache)
```bash
# Make the same request again
curl "https://your-backend.onrender.com/api/telemetry/2024/1/VER?lap=2"

# Second request: <100 milliseconds (instant!)
# Will see: ✅ Cache HIT (telemetry): 2024 1 R
```

### Step 3: Check Stats
```bash
curl https://your-backend.onrender.com/api/cache/stats

# Should show:
# - total_hits: increased
# - hit_rate_percent: 50%+ (or higher after more requests)
```

---

## Backend Logs (Performance Indicators)

### Watch Logs During Request
```
# First request - CACHE MISS
⏳ Cache MISS: Loading FastF1 session 2024 1 R [load #1, hits=0 misses=1]
✔ Loaded and cached: 2024 1 R (with telemetry)

# Subsequent requests - CACHE HIT  
✅ Cache HIT (telemetry): 2024 1 R [hits=2 misses=1]
✅ Cache HIT (telemetry): 2024 1 R [hits=3 misses=1]

# Different session - CACHE MISS again
⏳ Cache MISS: Loading FastF1 session 2024 2 R [load #2, hits=3 misses=2]
```

---

## Environment Variables (Production Config)

```bash
# Enable prewarm to load default sessions on startup
PREWARM_ENABLED=true
PREWARM_YEAR=2024
PREWARM_ROUND=1
PREWARM_DRIVERS=VER,HAM,LEC,NOR

# This ensures first users don't wait 60 seconds
# Instead, cache is warm and ready
```

---

## Expected Behavior

### First Request After Server Starts
```
Time: 60-90 seconds
Reason: FastF1 downloads ~100MB from official API
Log: ⏳ Cache MISS: Loading FastF1 session...
Hit Rate: Hit=0% (first load)
```

### Subsequent Requests  
```
Time: <100ms
Reason: In-memory cache hit
Log: ✅ Cache HIT...
Hit Rate: >60% (most requests from cache)
```

### Production (With Prewarm Enabled)
```
Time: <500ms (first request, cache already warm)
Time: <100ms (subsequent requests)
Hit Rate: >90% (most sessions preloaded)
```

---

## Common Cache Questions

**Q: Why is first request slow?**  
A: FastF1 must download session data from F1 API (~30-90 sec). This is unavoidable. Cache speeds up subsequent requests.

**Q: Can I speed up first requests?**  
A: Yes - enable `PREWARM_ENABLED=true` to load common sessions on startup. This makes the cache "warm" for first users.

**Q: How long does cache persist?**  
A: Until server restart or manual clear. Sessions persist for hours/days if server doesn't restart.

**Q: When should I clear cache?**  
A: Only if data seems stale or corrupted. Normal operation: never clear (let cache persist).

**Q: How much memory does cache use?**  
A: ~20-50 MB per session. Typical 12 sessions = 250-600 MB. Render free tier has 512 MB, so usually fine.

**Q: Is concurrent access safe?**  
A: Yes! Thread locks prevent race conditions. Multiple requests can safely use cached sessions.

---

## Performance Checklist

- [ ] Check `/api/cache/stats` shows hit_rate > 80%
- [ ] Look at logs for `✅ Cache HIT` (indicates cache is working)
- [ ] Verify first telemetry request takes 60-90 sec (normal)
- [ ] Verify second request of same data takes <1 sec (cache working)
- [ ] Monitor hit_rate stays high as server runs
- [ ] Consider enabling PREWARM for faster first user experience

---

## Troubleshooting Checklist

**Cache not working? (hit_rate near 0%)**
- [ ] Are different users requesting different sessions? (Cache is per-session)
- [ ] Check backend logs for error messages
- [ ] Try clearing cache and restarting: `POST /api/cache/clear`

**Responses still slow? (>2 sec for cached sessions)**
- [ ] Check hit_rate - might not be hitting cache
- [ ] Check backend CPU/memory - might be saturated
- [ ] Try smaller datasets (fewer laps requested)

**Memory growing? (Hit limit)**
- [ ] Check cache size: `/api/cache/stats` → cache_entries
- [ ] Clear cache: `POST /api/cache/clear`
- [ ] Consider restarting server

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/cache/stats` | GET | View cache performance metrics |
| `/api/cache/clear` | POST | Clear all caches (session + API) |
| `/api/cache/clear-sessions-only` | POST | Clear FastF1 session cache only |
| `/api/cache/clear-api-only` | POST | Clear API response cache only |

---

**Status: Cache system is fully implemented and optimized. ✅**

For detailed technical information, see [CACHING_PERFORMANCE.md](CACHING_PERFORMANCE.md).
