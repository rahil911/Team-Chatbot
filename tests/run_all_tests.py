#!/usr/bin/env python3
"""
Master Test Runner
Runs all test suites and provides comprehensive report
"""
import subprocess
import sys
import time
import requests
from typing import List, Tuple


BACKEND_URL = "http://localhost:8000"


def check_backend_running() -> bool:
    """Check if backend is running"""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        return response.status_code == 200
    except Exception:
        return False


def wait_for_backend(timeout: int = 30) -> bool:
    """Wait for backend to be ready"""
    print("🔍 Checking if backend is running...")

    start = time.time()
    while time.time() - start < timeout:
        if check_backend_running():
            print("✅ Backend is ready!")
            return True

        print("⏳ Waiting for backend to start...")
        time.sleep(2)

    return False


def run_test_suite(name: str, script: str) -> Tuple[bool, float]:
    """Run a test suite and return success status and duration"""
    print("\n" + "="*80)
    print(f"RUNNING: {name}")
    print("="*80)

    start = time.time()

    try:
        result = subprocess.run(
            [sys.executable, script],
            capture_output=False,  # Show output in real-time
            text=True,
            timeout=300  # 5 minute timeout
        )

        duration = time.time() - start
        success = result.returncode == 0

        if success:
            print(f"\n✅ {name} PASSED ({duration:.2f}s)")
        else:
            print(f"\n❌ {name} FAILED ({duration:.2f}s)")

        return success, duration

    except subprocess.TimeoutExpired:
        duration = time.time() - start
        print(f"\n❌ {name} TIMED OUT ({duration:.2f}s)")
        return False, duration

    except Exception as e:
        duration = time.time() - start
        print(f"\n❌ {name} ERROR: {e} ({duration:.2f}s)")
        return False, duration


def main():
    """Run all test suites"""
    print("="*80)
    print("COMPREHENSIVE TEST SUITE RUNNER")
    print("="*80)
    print()

    # Check backend
    if not wait_for_backend():
        print("\n❌ ERROR: Backend is not running!")
        print("   Please start the backend with: python server.py")
        print("   Then run tests again.")
        sys.exit(1)

    # Define test suites
    test_suites = [
        ("Health Endpoint Tests", "tests/test_health_endpoint.py"),
        ("WebSocket Multi-Browser Tests", "tests/test_websocket_multi_browser.py"),
    ]

    # Run all test suites
    results = []
    total_start = time.time()

    for name, script in test_suites:
        success, duration = run_test_suite(name, script)
        results.append((name, success, duration))

    total_duration = time.time() - total_start

    # Print final summary
    print("\n" + "="*80)
    print("FINAL TEST SUMMARY")
    print("="*80)

    passed = sum(1 for _, success, _ in results if success)
    failed = len(results) - passed

    for name, success, duration in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} | {name} ({duration:.2f}s)")

    print("="*80)
    print(f"Total Suites: {len(results)}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"⏱️  Total Time: {total_duration:.2f}s")
    print("="*80)

    if failed == 0:
        print("\n🎉 ALL TEST SUITES PASSED!")
        print("✅ Your WebSocket fixes are working correctly!")
        print("✅ Multi-browser scenarios work without crashes!")
        print("✅ Health endpoint and metrics are functional!")
        sys.exit(0)
    else:
        print("\n⚠️ SOME TEST SUITES FAILED")
        print("   Review the output above for details")
        sys.exit(1)


if __name__ == "__main__":
    main()
