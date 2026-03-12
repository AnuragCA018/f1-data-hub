"""
F1 Analytics — Automated API Test Suite
Run with:  python test_api.py
Or:        python test_api.py --verbose
           python test_api.py --base http://localhost:8000
Requires Python 3.9+ and the `requests` library (already in the venv).
"""
import argparse
import json
import sys
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests")
    sys.exit(1)

# ─── Config ───────────────────────────────────────────────────────────────────
DEFAULT_BASE = "http://localhost:8000"
TIMEOUT = 30  # seconds per request


# ─── Test infrastructure ──────────────────────────────────────────────────────
@dataclass
class TestResult:
    name: str
    passed: bool
    message: str = ""
    duration_ms: float = 0.0


@dataclass
class Suite:
    name: str
    results: list[TestResult] = field(default_factory=list)

    def run(self, name: str, fn: Callable) -> None:
        t0 = time.monotonic()
        try:
            fn()
            duration = (time.monotonic() - t0) * 1000
            self.results.append(TestResult(name, True, "OK", duration))
        except AssertionError as e:
            duration = (time.monotonic() - t0) * 1000
            self.results.append(TestResult(name, False, str(e), duration))
        except Exception as e:
            duration = (time.monotonic() - t0) * 1000
            self.results.append(TestResult(name, False, f"Exception: {e}", duration))


def assert_ok(resp, context: str = "") -> dict:
    assert resp.status_code < 400, (
        f"HTTP {resp.status_code} {context}: {resp.text[:200]}"
    )
    return resp.json()


def assert_keys(data: dict, *keys: str) -> None:
    for k in keys:
        assert k in data, f"Missing key '{k}' in response: {list(data.keys())}"


def assert_list(data: dict, key: str, min_len: int = 1) -> list:
    assert_keys(data, key)
    assert isinstance(data[key], list), f"'{key}' is not a list"
    assert len(data[key]) >= min_len, f"'{key}' has {len(data[key])} items, expected >= {min_len}"
    return data[key]


# ─── Test suites ──────────────────────────────────────────────────────────────
def run_health_tests(base: str, verbose: bool) -> Suite:
    s = Suite("Health & Root")
    sess = requests.Session()

    def test_root():
        d = assert_ok(sess.get(f"{base}/", timeout=TIMEOUT), "GET /")
        assert_keys(d, "message", "status")

    def test_health():
        d = assert_ok(sess.get(f"{base}/health", timeout=TIMEOUT), "GET /health")
        assert d.get("status") == "healthy", f"status={d.get('status')}"

    s.run("Root endpoint", test_root)
    s.run("Health endpoint", test_health)
    return s


def run_schedule_tests(base: str, verbose: bool) -> Suite:
    s = Suite("Schedule")
    sess = requests.Session()

    for year in [2026, 2025, 2024]:
        def test_schedule(y=year):
            d = assert_ok(sess.get(f"{base}/api/schedule/{y}", timeout=TIMEOUT), f"schedule/{y}")
            assert_keys(d, "year", "races", "total")
            races = assert_list(d, "races", min_len=1)
            for r in races[:3]:
                assert_keys(r, "round", "race_name", "circuit", "country", "date")

        s.run(f"Schedule {year}", test_schedule)

    def test_invalid_year():
        r = sess.get(f"{base}/api/schedule/1999", timeout=TIMEOUT)
        assert r.status_code == 400, f"Expected 400 for year 1999, got {r.status_code}"

    s.run("Invalid year → 400", test_invalid_year)
    return s


def run_results_tests(base: str, verbose: bool) -> Suite:
    s = Suite("Race Results & Standings")
    sess = requests.Session()

    def test_standings_2025():
        d = assert_ok(sess.get(f"{base}/api/standings/2025", timeout=TIMEOUT), "standings/2025")
        assert_keys(d, "year", "driver_standings", "constructor_standings")
        # driver standings may be empty early in season – just check structure
        if d["driver_standings"]:
            r = d["driver_standings"][0]
            assert_keys(r, "position", "driver_code", "points")

    def test_standings_2024():
        d = assert_ok(sess.get(f"{base}/api/standings/2024", timeout=TIMEOUT), "standings/2024")
        assert_keys(d, "driver_standings", "constructor_standings")
        assert len(d["driver_standings"]) >= 20, "Expected 20+ drivers in full 2024 standings"

    s.run("Standings 2025 structure", test_standings_2025)
    s.run("Standings 2024 completeness", test_standings_2024)
    return s


def run_drivers_tests(base: str, verbose: bool) -> Suite:
    s = Suite("Drivers")
    sess = requests.Session()

    def test_all_drivers():
        d = assert_ok(sess.get(f"{base}/api/drivers", timeout=TIMEOUT), "GET /api/drivers")
        assert_keys(d, "drivers")
        # May be empty if no sessions loaded yet — just assert structure
        if d["drivers"]:
            assert_keys(d["drivers"][0], "driver_code", "name")

    def test_unknown_driver():
        r = sess.get(f"{base}/api/driver/ZZZ", timeout=TIMEOUT)
        assert r.status_code == 404, f"Expected 404 for unknown driver, got {r.status_code}"

    s.run("List all drivers", test_all_drivers)
    s.run("Unknown driver → 404", test_unknown_driver)
    return s


def run_telemetry_tests(base: str, verbose: bool) -> Suite:
    s = Suite("Telemetry (structure only – no FastF1 download)")
    sess = requests.Session()

    def test_compare_endpoint_structure():
        """Check the endpoint exists and returns JSON, even if data is empty."""
        r = sess.get(
            f"{base}/api/telemetry/compare/2026/1",
            params={"driver1": "VER", "driver2": "NOR", "lap1": 1, "lap2": 1, "session_type": "R"},
            timeout=TIMEOUT,
        )
        # 200 with data or 500 with error detail is acceptable here
        # (session data may not be loaded); 404 would indicate a routing bug
        assert r.status_code != 404, "Telemetry compare endpoint not found (404)"
        if r.status_code == 200:
            d = r.json()
            assert_keys(d, "year", "race", "driver1", "driver2")
            assert_keys(d["driver1"], "code", "lap", "points")
            assert isinstance(d["driver1"]["points"], list)

    s.run("Compare endpoint returns JSON (not 404)", test_compare_endpoint_structure)
    return s


# ─── Runner ────────────────────────────────────────────────────────────────────
def run_all(base: str, verbose: bool) -> int:
    print()
    print("╔══════════════════════════════════════════════╗")
    print("║  F1 Analytics — API Test Suite               ║")
    print("╚══════════════════════════════════════════════╝")
    print(f"  Backend: {base}")
    print()

    suites = [
        run_health_tests(base, verbose),
        run_schedule_tests(base, verbose),
        run_results_tests(base, verbose),
        run_drivers_tests(base, verbose),
        run_telemetry_tests(base, verbose),
    ]

    total_pass = 0
    total_fail = 0

    for suite in suites:
        suite_pass = sum(1 for r in suite.results if r.passed)
        suite_fail = sum(1 for r in suite.results if not r.passed)
        total_pass += suite_pass
        total_fail += suite_fail

        print(f"  ── {suite.name} ({suite_pass}/{len(suite.results)} passed) ──")
        for r in suite.results:
            mark  = "✓" if r.passed else "✗"
            color = "\033[32m" if r.passed else "\033[31m"
            reset = "\033[0m"
            dur   = f"{r.duration_ms:.0f}ms"
            print(f"    {color}{mark}{reset}  {r.name:<45} {dur}")
            if not r.passed and verbose:
                print(f"       └─ {r.message}")
        print()

    print("─────────────────────────────────────────────────")
    if total_fail == 0:
        print(f"  \033[32m✓ ALL {total_pass} TESTS PASSED\033[0m")
    else:
        print(f"  \033[31m✗ {total_fail} FAILED / {total_pass + total_fail} TOTAL\033[0m")
        if not verbose:
            print("  Run with --verbose for details on failures.")
    print("─────────────────────────────────────────────────")
    print()

    return total_fail


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="F1 Analytics API test suite")
    parser.add_argument("--base", default=DEFAULT_BASE, help="Backend base URL")
    parser.add_argument("--verbose", action="store_true", help="Show failure details")
    args = parser.parse_args()

    failures = run_all(args.base, args.verbose)
    sys.exit(min(failures, 1))
