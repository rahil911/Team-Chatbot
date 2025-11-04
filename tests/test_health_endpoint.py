"""
Health Endpoint and API Testing
Tests the /health endpoint and connection metrics
"""
import requests
import time
import asyncio
import websockets
import json
import os
from typing import Dict, Any


BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
WS_URL = BACKEND_URL.replace("http://", "ws://").replace("https://", "wss://") + "/ws"


def test_root_endpoint():
    """Test 1: Root endpoint returns basic info"""
    print("\n" + "="*60)
    print("TEST 1: Root Endpoint")
    print("="*60)

    response = requests.get(f"{BACKEND_URL}/")

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()

    assert "service" in data, "Missing 'service' field"
    assert "status" in data, "Missing 'status' field"
    assert "agents" in data, "Missing 'agents' field"
    assert "nodes" in data, "Missing 'nodes' field"

    print(f"✅ Service: {data['service']}")
    print(f"✅ Status: {data['status']}")
    print(f"✅ Agents: {data['agents']}")
    print(f"✅ Nodes: {data['nodes']}")

    print("✅ TEST 1 PASSED: Root endpoint works")


def test_health_endpoint_structure():
    """Test 2: Health endpoint returns correct structure"""
    print("\n" + "="*60)
    print("TEST 2: Health Endpoint Structure")
    print("="*60)

    response = requests.get(f"{BACKEND_URL}/health")

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()

    # Required top-level fields
    required_fields = ["status", "service", "timestamp", "uptime_hours",
                       "websocket_metrics", "knowledge_graph", "agents"]

    for field in required_fields:
        assert field in data, f"Missing required field: {field}"
        print(f"✅ Field present: {field}")

    # WebSocket metrics
    ws_metrics = data["websocket_metrics"]
    ws_required = ["active_connections", "unique_browser_sessions",
                   "processing_connections", "pending_swaps",
                   "total_connections_lifetime", "total_messages",
                   "avg_messages_per_connection"]

    for field in ws_required:
        assert field in ws_metrics, f"Missing WebSocket metric: {field}"
        print(f"  ✅ WebSocket metric: {field} = {ws_metrics[field]}")

    # Knowledge graph
    kg = data["knowledge_graph"]
    assert "nodes" in kg, "Missing knowledge_graph.nodes"
    assert "edges" in kg, "Missing knowledge_graph.edges"
    print(f"✅ Knowledge Graph: {kg['nodes']} nodes, {kg['edges']} edges")

    # Status should be healthy
    assert data["status"] in ["healthy", "degraded"], \
        f"Invalid status: {data['status']}"
    print(f"✅ Status: {data['status']}")

    print("✅ TEST 2 PASSED: Health endpoint structure correct")


def test_health_metrics_initial_state():
    """Test 3: Health metrics in initial state"""
    print("\n" + "="*60)
    print("TEST 3: Health Metrics Initial State")
    print("="*60)

    response = requests.get(f"{BACKEND_URL}/health")
    data = response.json()

    ws_metrics = data["websocket_metrics"]

    # Initial state checks
    assert ws_metrics["active_connections"] >= 0, "Invalid active_connections"
    assert ws_metrics["total_connections_lifetime"] >= 0, "Invalid total_connections"
    assert ws_metrics["total_messages"] >= 0, "Invalid total_messages"

    print(f"✅ Active Connections: {ws_metrics['active_connections']}")
    print(f"✅ Total Connections (Lifetime): {ws_metrics['total_connections_lifetime']}")
    print(f"✅ Total Messages: {ws_metrics['total_messages']}")
    print(f"✅ Uptime: {data['uptime_hours']:.2f} hours")

    print("✅ TEST 3 PASSED: Metrics in valid state")


async def test_health_metrics_with_connections():
    """Test 4: Health metrics update with active connections"""
    print("\n" + "="*60)
    print("TEST 4: Health Metrics with Active Connections")
    print("="*60)

    # Get initial metrics
    response1 = requests.get(f"{BACKEND_URL}/health")
    data1 = response1.json()
    initial_connections = data1["websocket_metrics"]["active_connections"]
    initial_lifetime = data1["websocket_metrics"]["total_connections_lifetime"]

    print(f"📊 Initial active connections: {initial_connections}")
    print(f"📊 Initial lifetime connections: {initial_lifetime}")

    # Open 3 WebSocket connections
    print("🔌 Opening 3 WebSocket connections...")
    ws_clients = []
    for i in range(3):
        ws = await websockets.connect(WS_URL)
        ws_clients.append(ws)
        await ws.send(json.dumps({
            "type": "register_session",
            "browser_session_id": f"test_session_{i}"
        }))
        await asyncio.sleep(0.5)

    # Get updated metrics
    await asyncio.sleep(1)
    response2 = requests.get(f"{BACKEND_URL}/health")
    data2 = response2.json()
    updated_connections = data2["websocket_metrics"]["active_connections"]
    updated_lifetime = data2["websocket_metrics"]["total_connections_lifetime"]

    print(f"📊 Updated active connections: {updated_connections}")
    print(f"📊 Updated lifetime connections: {updated_lifetime}")

    # Assertions
    assert updated_connections == initial_connections + 3, \
        f"Expected {initial_connections + 3} active, got {updated_connections}"

    assert updated_lifetime == initial_lifetime + 3, \
        f"Expected {initial_lifetime + 3} lifetime, got {updated_lifetime}"

    print("✅ Active connections increased correctly")
    print("✅ Lifetime connections tracked correctly")

    # Close connections
    for ws in ws_clients:
        await ws.close()

    # Note: Connection cleanup timing is async and unpredictable in tests
    # The important thing is that connections were tracked correctly above
    # Real cleanup is tested in the WebSocket multi-browser test suite

    print("✅ Connections tracked and increased correctly")

    print("✅ TEST 4 PASSED: Metrics update with connections")


def test_health_response_time():
    """Test 5: Health endpoint response time"""
    print("\n" + "="*60)
    print("TEST 5: Health Endpoint Response Time")
    print("="*60)

    # Measure response time over 5 requests
    times = []
    for i in range(5):
        start = time.time()
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        elapsed = time.time() - start

        assert response.status_code == 200, "Health check failed"
        times.append(elapsed)

        print(f"  Request {i+1}: {elapsed*1000:.2f}ms")

    avg_time = sum(times) / len(times)
    max_time = max(times)

    print(f"✅ Average response time: {avg_time*1000:.2f}ms")
    print(f"✅ Max response time: {max_time*1000:.2f}ms")

    # Different thresholds for local vs production
    # Local should be < 100ms, production can be slower due to network/Azure
    is_production = "azurecontainerapps.io" in BACKEND_URL
    threshold = 1.0 if is_production else 0.1  # 1s for prod, 100ms for local

    assert avg_time < threshold, f"Health check too slow: {avg_time*1000:.2f}ms (threshold: {threshold*1000:.0f}ms)"

    print(f"✅ TEST 5 PASSED: Response time acceptable ({'production' if is_production else 'local'} threshold: {threshold*1000:.0f}ms)")


def test_api_graph_endpoint():
    """Test 6: /api/graph endpoint"""
    print("\n" + "="*60)
    print("TEST 6: /api/graph Endpoint")
    print("="*60)

    response = requests.get(f"{BACKEND_URL}/api/graph")

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()

    assert "nodes" in data, "Missing 'nodes'"
    assert "edges" in data, "Missing 'edges'"
    assert "elements" in data, "Missing 'elements'"

    print(f"✅ Nodes: {data['nodes']}")
    print(f"✅ Edges: {data['edges']}")
    print(f"✅ Elements: {len(data['elements'])} total")

    assert data['nodes'] > 0, "No nodes in graph"
    assert data['edges'] > 0, "No edges in graph"
    assert len(data['elements']) > 0, "No elements"

    print("✅ TEST 6 PASSED: Graph endpoint works")


def test_health_endpoint_stress():
    """Test 7: Health endpoint under concurrent load"""
    print("\n" + "="*60)
    print("TEST 7: Health Endpoint Stress Test")
    print("="*60)

    import concurrent.futures

    def make_request(i):
        try:
            response = requests.get(f"{BACKEND_URL}/health", timeout=5)
            return response.status_code == 200
        except Exception as e:
            print(f"  ❌ Request {i} failed: {e}")
            return False

    # Make 50 concurrent requests
    print("📊 Making 50 concurrent requests...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(make_request, i) for i in range(50)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    success_count = sum(results)
    print(f"✅ Successful: {success_count}/50")

    assert success_count == 50, f"Some requests failed: {success_count}/50"

    print("✅ TEST 7 PASSED: Handled concurrent requests")


def run_all_tests():
    """Run all health endpoint tests"""
    print("\n" + "="*80)
    print("HEALTH ENDPOINT TEST SUITE")
    print("="*80)

    tests = [
        ("Root Endpoint", test_root_endpoint),
        ("Health Endpoint Structure", test_health_endpoint_structure),
        ("Health Metrics Initial State", test_health_metrics_initial_state),
        ("Health Metrics with Connections", lambda: asyncio.run(test_health_metrics_with_connections())),
        ("Health Response Time", test_health_response_time),
        ("API Graph Endpoint", test_api_graph_endpoint),
        ("Health Endpoint Stress", test_health_endpoint_stress),
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            test_func()
            passed += 1
        except Exception as e:
            print(f"\n❌ TEST FAILED: {name}")
            print(f"   Error: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

        time.sleep(1)  # Delay between tests

    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"✅ Passed: {passed}/{len(tests)}")
    print(f"❌ Failed: {failed}/{len(tests)}")

    if failed == 0:
        print("🎉 ALL TESTS PASSED!")
        return True
    else:
        print("⚠️ SOME TESTS FAILED")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
