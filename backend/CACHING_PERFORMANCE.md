# FastF1 Session Caching — Performance Optimization Guide

## Overview

The F1 Data Hub backend uses an **in-memory session cache** to dramatically improve performance. FastF1 session data is expensive to load (30-90 seconds), but once loaded can be reused indefinitely.

---

## Performance Characteristics

### Without Cache
```
First telemetry request:  45-90 seconds (FastF1 download)
Second telemetry request: 45-90 seconds (downloads again)
Third telemetry request:  45-90 seconds (downloads again)
```

### With In-Memory Cache (Current Implementation)
```
First telemetry request:  45-90 seconds (FastF1 download + cache)
Second telemetry request: <100 milliseconds (cache hit!)
Third telemetry request:  <100 milliseconds (cache hit!)
Fourth telemetry request: <100 milliseconds (cache hit!)
```

**At scale:** With prewarm enabled, most requests hit cache = **instant responses** ⚡

---

## How It Works

### Cache Layers

```
Request for telemetry/2024/1/VER
              ↓
    Check in-memory cache
              ↓
    HIT: Return cached session           (<100ms) ✅
              ↓
    MISS: Load from FastF1 API           (60-90sec)
              ↓
    Load complete
              ↓
    Store in memory cache
              ↓
    Extract data from session
              ↓
    Store in SQLite
              ↓
    Return to user
```

### Cache Keys

Sessions are cached with composite keys:

```python
# Basic session (no telemetry)
key = (year, race_name, session_type, False)
# Example: (2024, "1", "R", False)

# Session with telemetry
key = (year, race_name, session_type, True)
# Example: (2024, "1", "R", True)

# Track session (special cache)
key = ("track", year, round_number, session_type)
# Example: ("track", 2024, 1, "Q")
```

---

## Monitoring Cache Performance

### Check Cache Statistics Endpoint

```bash
curl https://your-backend.onrender.com/api/cache/stats
```

**Response:**
```json
{
  "cache_entries": 12,
  "total_hits": 1547,
  "total_misses": 23,
  "total_loads": 23,
  "hit_rate_percent": 98.5,
  "cached_sessions": [
    [2024, "1", "R", true],
    [2024, "1", "R", false],
    ["track", 2024, 1, "Q"],
    ...
  ]
}
```

### Interpreting Statistics

| Metric | Good Value | Meaning |
|--------|-----------|---------|
| cache_entries | 8-20 | Number of session objects in memory |
| total_hits | >100 | Cache is being reused |
| total_misses | Low | Minimal downloads needed |
| hit_rate_percent | >80% | Excellent cache utilization |
| total_loads | Low | Minimal expensive operations |

---

## Backend Logging

The backend logs cache hits and misses to help you understand performance:

### Cache Hit (Fast)
```
✅ Cache HIT (telemetry): 2024 1 R [hits=1547 misses=23]
```

### Cache Miss (Slow)
```
⏳ Cache MISS: Loading FastF1 session 2024 1 R [load #23, hits=1547 misses=23]
⏳ Cache MISS: Loading FastF1 session WITH TELEMETRY 2024 1 R [load #23, hits=1547 misses=23]
```

### Loading Complete
```
✔ Loaded and cached: 2024 1 R (with telemetry)
✔ Track loaded OK - 71 laps [2024/1/Q]
```

---

## Key Functions

### `load_f1_session(year, race, session_type)`
Loads FastF1 session data without telemetry. Caches for reuse.
- **First call:** 30-60 seconds
- **Cached calls:** <100 milliseconds

### `load_f1_session_with_telemetry(year, race, session_type)`
Loads FastF1 session data WITH telemetry. Caches for reuse.
- **First call:** 45-90 seconds (longer, includes telemetry)
- **Cached calls:** <100 milliseconds

### `load_session_for_track(year, round_number, session_type)`
Special function for track/GPS data. Has additional robustness:
- Verifies session integrity after load
- Retries with fresh download if cache is corrupted
- Uses per-key locks to prevent race conditions

---

## Thread Safety

All cache operations are protected by locks:

```python
_session_lock = threading.Lock()          # Main cache lock
_track_load_locks = {}                    # Per-session locks
_track_load_locks_guard = threading.Lock() # Guard for creating locks
```

This ensures:
- ✅ Multiple concurrent requests can read cache safely
- ✅ Only one thread loads each session (prevents duplicate work)
- ✅ No race conditions or data corruption

---

## Cache Management

### View Cache Statistics
```bash
GET /api/cache/stats
```

### Clear All Caches
```bash
POST /api/cache/clear
```
Clears both FastF1 session cache and API response cache.

### Clear Session Cache Only
```bash
POST /api/cache/clear-sessions-only
```
Forces fresh FastF1 downloads on next request.

### Clear API Cache Only
```bash
POST /api/cache/clear-api-only
```
Removes cached schedule and standings (less frequently needed).

---

## Performance Optimization Tips

### 1. Enable Prewarm Service
The backend automatically preloads common sessions on startup:

```bash
PREWARM_ENABLED=true
PREWARM_YEAR=2024
PREWARM_ROUND=1
PREWARM_DRIVERS=VER,HAM,LEC,NOR
```

**Benefits:**
- Cache is "warm" when the service starts
- First few users get instant responses (not 60+ second waits)
- Subsequent users always hit cache

### 2. Monitor Hit Rate
Check `/api/cache/stats` periodically:
- Hit rate < 50%? Sessions are being used once and discarded
- Hit rate > 80%? Excellent cache efficiency ✅

### 3. Cache Invalidation
The cache is **never automatically invalidated**. It persists for:
- Server uptime (resets on restart)
- Session duration (3-4 hours per typical server lifecycle)

For stale data concerns:
- Use `POST /api/cache/clear` to force refresh
- Or restart the server (causes brief downtime)

### 4. Memory Usage
- Each cached session: ~10-50 MB depending on data complexity
- Track sessions: 30 MB (includes full telemetry)
- Typical cache: 12-20 sessions = 200-400 MB
- Render free tier: 512 MB available ✅

---

## Real-World Performance Example

### Scenario: User requests telemetry for 5 different races

**Without cache:**
```
Request 1 (2024 R1): 60 seconds ❌
Request 2 (2024 R2): 60 seconds ❌
Request 3 (2024 R3): 60 seconds ❌
Request 4 (2024 R4): 60 seconds ❌
Request 5 (2024 R5): 60 seconds ❌
Total: 300 seconds (5 minutes) 😭
```

**With cache:**
```
Request 1 (2024 R1): 60 seconds (first load)
Request 2 (2024 R2): 60 seconds (first load)
Request 3 (2024 R3): 60 seconds (first load)
Request 4 (2024 R4): 0.1 seconds (cache hit!) ✅
Request 5 (2024 R5): 0.1 seconds (cache hit!) ✅
Total: 180 seconds (3 minutes) + repeated requests are <1 sec 🚀
```

---

## Cache Behavior Details

### Shared Telemetry Cache
Once a session is loaded WITH telemetry, future requests for that session (with or without telemetry) use the cached version. This is safe because:
- Telemetry data ⊇ Basic data
- No need to reload without less data

### Track vs Regular Sessions
Track sessions are cached separately with special handling:
- Separate cache key: `("track", year, round, session_type)`
- Extra validation: probes session after load
- Automatic retry: clears corrupted disk cache and retries
- Purpose: Ensures track maps are always reliable (GPS data critical)

### SmallDownloads Not Cached
Some operations don't benefit from caching:
- Schedule (fast to download, changes weekly)
- Team list (static, cached elsewhere)
- Driver list (static data)

### Session Duration Cache
The cache exists for server's lifetime unless:
- Manually cleared via `/api/cache/clear`
- Server restarts
- Stale cache detected (track probes)

---

## Troubleshooting Cache Issues

### Symptom: Repeated timeouts, hit rate near 0
**Likely cause:** Failed initial loads, sessions not being cached  
**Solution:** Hard restart backend (clears corrupted cache)

### Symptom: High memory usage, slow responses
**Likely cause:** Cache growing too large  
**Solution:** Clear cache with `POST /api/cache/clear`

### Symptom: Outdated data being returned
**Likely cause:** Data has changed but cache not invalidated  
**Solution:** Call `POST /api/cache/clear` to force refresh

### Symptom: Track map showing wrong GPS data
**Likely cause:** Corrupted disk cache from FastF1  
**Solution:** Automatic - backend detects and retries with fresh download

---

## Code Examples

### Checking Cache in Logs
Look for these patterns in backend logs:

```
# Good - highly cached
✅ Cache HIT: 2024 1 R
✅ Cache HIT: 2024 1 R
✔ Loaded and cached: 2024 1 R (with telemetry)
✅ Cache HIT (telemetry): 2024 1 R

# Getting stale - needs refresh
⏳ Cache MISS: Loading FastF1 session 2024 2 R
⏳ Cache MISS: Loading FastF1 session 2024 3 R
```

### Manual Cache Inspection
From backend code:
```python
from services import f1_service

# Get cache stats
stats = f1_service.get_cache_stats()
print(f"Hit rate: {stats['hit_rate_percent']}%")
print(f"Cache size: {stats['cache_entries']}")

# Clear if needed
f1_service.clear_session_cache()
```

---

## Performance Expectations

| Scenario | Time | Hit Expected |
|----------|------|--------------|
| First user, first session | 60-90 sec | ❌ Cache MISS |
| Same user, same session | <100ms | ✅ Cache HIT |
| Concurrent users, same session | <100ms | ✅ Cache HIT (all after first) |
| Different session | 60-90 sec | ❌ Cache MISS |
| Back-to-back same calls | <5ms | ✅ Cache HIT |
| After server restart | 60-90 sec | ❌ Cache cold |
| With prewarm enabled | <100ms | ✅ Warm cache |

---

## Summary

The caching system dramatically improves performance:
- **60-90 second first loads** are unavoidable (FastF1 API )
- **Cached loads are instant** (<100ms)
- **At scale, most requests hit cache** = fast responses for users
- **Thread-safe** for concurrent requests
- **Monitorable** via `/api/cache/stats` endpoint

✅ **Current implementation is production-ready.**

The main bottleneck remaining is the initial 60-90 second load. This cannot be improved without:
- Offline data storage (not practical)
- Caching at CDN level (would be stale)
- Precomputation of all sessions (requires running continuously)

Our approach (prewarm + in-memory cache) is **optimal for this use case**. 🚀
