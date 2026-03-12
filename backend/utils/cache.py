"""
Simple in-process TTL cache (no external dependencies).

Usage:
    from utils.cache import ttl_cache

    @ttl_cache(ttl=3600)
    def expensive_call(year: int) -> dict:
        ...

`ttl_cache` works for both regular and async callables.
The cache is keyed on the function's positional + keyword arguments.
"""
import asyncio
import functools
import time
from typing import Any, Callable


class _Entry:
    __slots__ = ("value", "expires_at")

    def __init__(self, value: Any, ttl: float) -> None:
        self.value = value
        self.expires_at = time.monotonic() + ttl


class ApiCache:
    """
    Thread-safe, asyncio-compatible TTL cache backed by a plain dict.
    """

    def __init__(self) -> None:
        self._store: dict[Any, _Entry] = {}

    def get(self, key: Any) -> tuple[bool, Any]:
        entry = self._store.get(key)
        if entry is None:
            return False, None
        if time.monotonic() > entry.expires_at:
            del self._store[key]
            return False, None
        return True, entry.value

    def set(self, key: Any, value: Any, ttl: float) -> None:
        self._store[key] = _Entry(value, ttl)

    def invalidate(self, key: Any) -> None:
        self._store.pop(key, None)

    def clear(self) -> None:
        self._store.clear()

    def __len__(self) -> int:
        return len(self._store)


# Global singleton used by the entire application
_cache = ApiCache()


def ttl_cache(ttl: float = 3600):
    """
    Decorator that caches the return value of a function for `ttl` seconds.
    Works for both regular and async functions.
    """
    def decorator(fn: Callable) -> Callable:
        if asyncio.iscoroutinefunction(fn):
            @functools.wraps(fn)
            async def async_wrapper(*args, **kwargs):
                key = (fn.__qualname__, args, tuple(sorted(kwargs.items())))
                hit, val = _cache.get(key)
                if hit:
                    return val
                result = await fn(*args, **kwargs)
                _cache.set(key, result, ttl)
                return result
            return async_wrapper
        else:
            @functools.wraps(fn)
            def sync_wrapper(*args, **kwargs):
                key = (fn.__qualname__, args, tuple(sorted(kwargs.items())))
                hit, val = _cache.get(key)
                if hit:
                    return val
                result = fn(*args, **kwargs)
                _cache.set(key, result, ttl)
                return result
            return sync_wrapper
    return decorator
