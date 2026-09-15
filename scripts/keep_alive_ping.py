"""
Lightweight Uptime Monitoring & Wake-Up Script
Target: Render Backend Health Endpoint (/api/health)
"""

import sys
import time
import json
import argparse
import urllib.request
import urllib.error
from datetime import datetime

HEALTH_URL = "https://resume-screening-qn3r.onrender.com/api/health"
DEFAULT_INTERVAL_SECONDS = 600  # 10 minutes
REQUEST_TIMEOUT_SECONDS = 35


def log_message(msg: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}", flush=True)


def check_health(url: str = HEALTH_URL) -> bool:
    """
    Sends a lightweight HTTP GET request to /api/health.
    Does NOT call any auth, database, or AI endpoints.
    Expects HTTP 200 and {"status": "healthy"}.
    """
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Render-Uptime-Monitor/1.0", "Accept": "application/json"},
        method="GET",
    )

    try:
        start_time = time.time()
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            status_code = response.getcode()
            response_body = response.read().decode("utf-8")
            elapsed = round((time.time() - start_time) * 1000, 2)

            if status_code == 200:
                data = json.loads(response_body)
                if data.get("status") == "healthy":
                    log_message(
                        f"SUCCESS: Backend is ALIVE (HTTP {status_code}) - {elapsed}ms | Version: {data.get('version', 'N/A')}"
                    )
                    return True
                else:
                    log_message(
                        f"WARNING: HTTP 200 returned unexpected status payload: {response_body}"
                    )
                    return False
            else:
                log_message(f"FAILURE: Received unexpected status code: {status_code}")
                return False

    except urllib.error.HTTPError as e:
        log_message(f"HTTP ERROR: Backend returned code {e.code} - {e.reason}")
        return False
    except urllib.error.URLError as e:
        log_message(f"CONNECTION ERROR: Unable to reach backend: {e.reason}")
        return False
    except TimeoutError:
        log_message(f"TIMEOUT ERROR: Request timed out after {REQUEST_TIMEOUT_SECONDS}s.")
        return False
    except Exception as e:
        log_message(f"UNEXPECTED ERROR: {type(e).__name__}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Lightweight keep-alive ping for Render backend."
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run check once and exit immediately with status code.",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=DEFAULT_INTERVAL_SECONDS,
        help=f"Interval between pings in seconds (default: {DEFAULT_INTERVAL_SECONDS}s / 10m).",
    )
    args = parser.parse_args()

    log_message(f"Starting uptime monitor for: {HEALTH_URL}")

    if args.once:
        success = check_health()
        sys.exit(0 if success else 1)

    log_message(f"Loop mode active. Pinging every {args.interval} seconds (10 min). Press Ctrl+C to stop.")
    while True:
        try:
            check_health()
            time.sleep(args.interval)
        except KeyboardInterrupt:
            log_message("Monitoring stopped by user.")
            break


if __name__ == "__main__":
    main()
