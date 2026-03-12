from typing import Any


def to_int_or_str(value: str) -> Any:
    """Return int if the string is a pure digit string, otherwise return as-is."""
    try:
        return int(value)
    except (ValueError, TypeError):
        return value


def seconds_to_laptime(seconds: float) -> str:
    """Convert float seconds to M:SS.mmm display string."""
    if seconds is None:
        return ""
    minutes = int(seconds // 60)
    secs = seconds - minutes * 60
    return f"{minutes}:{secs:06.3f}"


def row_to_dict(row) -> dict:
    """Convert a sqlite3.Row to a plain dict."""
    return dict(row)
