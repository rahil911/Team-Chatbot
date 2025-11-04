#!/usr/bin/env python3
"""
Production Test Runner - Tests deployed Azure environment

Usage:
    python tests/run_production_tests.py              # Test production
    python tests/run_production_tests.py --local      # Test local
    python tests/run_production_tests.py --both       # Test both environments
"""

import sys
import subprocess
import time
import argparse
import requests

# Production URLs
PROD_BACKEND = "https://kg-student-backend.ambitiouswave-220155c4.eastus2.azurecontainerapps.io"
PROD_FRONTEND = "https://purple-ocean-0a69d8a0f.3.azurestaticapps.net"

# Local URLs
LOCAL_BACKEND = "http://localhost:8000"
LOCAL_FRONTEND = "http://localhost:5173"


def check_backend_health(backend_url, timeout=10):
    """Check if backend is healthy"""
    try:
        response = requests.get(f"{backend_url}/health", timeout=timeout)
        if response.status_code == 200:
            data = response.json()
            return True, data
        return False, None
    except Exception as e:
        return False, str(e)


def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 80)
    print(text.center(80))
    print("=" * 80 + "\n")


def print_section(text):
    """Print a section header"""
    print("\n" + "-" * 80)
    print(text)
    print("-" * 80)


def run_tests_for_environment(env_name, backend_url, websocket_url):
    """Run all tests for a specific environment"""

    print_header(f"TESTING {env_name.upper()} ENVIRONMENT")

    # Check backend health first
    print_section("🏥 Checking Backend Health")
    healthy, data = check_backend_health(backend_url)

    if not healthy:
        print(f"❌ Backend at {backend_url} is not healthy!")
        print(f"   Error: {data}")
        return False

    print(f"✅ Backend is healthy!")
    print(f"   Service: {data.get('service', 'Unknown')}")
    print(f"   Status: {data.get('status', 'Unknown')}")
    print(f"   Uptime: {data.get('uptime_hours', 0):.2f} hours")
    print(f"   Active Connections: {data['websocket_metrics']['active_connections']}")
    print(f"   Lifetime Connections: {data['websocket_metrics']['total_connections_lifetime']}")
    print(f"   Knowledge Graph: {data['knowledge_graph']['nodes']} nodes, {data['knowledge_graph']['edges']} edges")

    # Run health endpoint tests
    print_section("🧪 Running Health Endpoint Tests")
    result = subprocess.run(
        [sys.executable, "tests/test_health_endpoint.py"],
        env={**subprocess.os.environ, "BACKEND_URL": backend_url},
        capture_output=False
    )

    if result.returncode != 0:
        print(f"❌ Health endpoint tests FAILED for {env_name}")
        return False

    print(f"✅ Health endpoint tests PASSED for {env_name}")

    # Run WebSocket tests
    print_section("🧪 Running WebSocket Multi-Browser Tests")
    result = subprocess.run(
        [sys.executable, "tests/test_websocket_multi_browser.py"],
        env={**subprocess.os.environ, "BACKEND_URL": websocket_url},
        capture_output=False
    )

    if result.returncode != 0:
        print(f"❌ WebSocket tests FAILED for {env_name}")
        return False

    print(f"✅ WebSocket tests PASSED for {env_name}")

    return True


def main():
    parser = argparse.ArgumentParser(description="Test local or production environments")
    parser.add_argument("--local", action="store_true", help="Test local environment only")
    parser.add_argument("--production", action="store_true", help="Test production only (default)")
    parser.add_argument("--both", action="store_true", help="Test both environments")
    parser.add_argument("--wait", type=int, default=0, help="Wait N seconds before testing (useful for deployment)")

    args = parser.parse_args()

    # Default to production if nothing specified
    if not args.local and not args.both:
        args.production = True

    print_header("🚀 PRODUCTION TEST SUITE RUNNER")

    # Wait if requested (for deployment to complete)
    if args.wait > 0:
        print(f"⏳ Waiting {args.wait} seconds for deployment to complete...")
        time.sleep(args.wait)

    results = {}

    # Test local environment
    if args.local or args.both:
        local_ws = LOCAL_BACKEND.replace("http://", "ws://")
        success = run_tests_for_environment("LOCAL", LOCAL_BACKEND, local_ws)
        results["local"] = success

    # Test production environment
    if args.production or args.both:
        # Convert HTTPS to WSS for WebSocket URL
        prod_ws = PROD_BACKEND.replace("https://", "wss://")
        success = run_tests_for_environment("PRODUCTION", PROD_BACKEND, prod_ws)
        results["production"] = success

    # Print final summary
    print_header("📊 FINAL TEST SUMMARY")

    all_passed = True
    for env, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{env.upper():15} {status}")
        if not passed:
            all_passed = False

    print("\n" + "=" * 80)

    if all_passed:
        print("🎉 ALL ENVIRONMENTS PASSED!")
        print("=" * 80 + "\n")
        return 0
    else:
        print("⚠️  SOME ENVIRONMENTS FAILED")
        print("=" * 80 + "\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
