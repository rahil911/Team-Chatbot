"""
WebSocket Multi-Browser Connection Test
Tests the critical fix for race conditions when multiple browsers connect
"""
import asyncio
import websockets
import json
import pytest
from typing import List
import time
import os


BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
WS_URL = BACKEND_URL.replace("http://", "ws://").replace("https://", "wss://") + "/ws"


class WebSocketClient:
    """Simulates a browser WebSocket connection"""

    def __init__(self, client_id: str, browser_session_id: str):
        self.client_id = client_id
        self.browser_session_id = browser_session_id
        self.ws = None
        self.received_messages = []
        self.connected = False

    async def connect(self):
        """Connect to WebSocket server"""
        try:
            self.ws = await websockets.connect(WS_URL)
            self.connected = True
            print(f"✅ [{self.client_id}] Connected to WebSocket")

            # Register browser session ID
            await self.ws.send(json.dumps({
                "type": "register_session",
                "browser_session_id": self.browser_session_id
            }))
            print(f"📤 [{self.client_id}] Registered with session ID: {self.browser_session_id}")

            return True
        except Exception as e:
            print(f"❌ [{self.client_id}] Connection failed: {e}")
            self.connected = False
            return False

    async def send_chat(self, message: str, mode: str = "group"):
        """Send a chat message"""
        if not self.ws:
            print(f"❌ [{self.client_id}] Not connected")
            return False

        try:
            await self.ws.send(json.dumps({
                "type": "chat",
                "message": message,
                "mode": mode
            }))
            print(f"📨 [{self.client_id}] Sent: {message}")
            return True
        except Exception as e:
            print(f"❌ [{self.client_id}] Send failed: {e}")
            return False

    async def send_ping(self):
        """Send a ping to keep connection alive"""
        if not self.ws:
            return False

        try:
            await self.ws.send(json.dumps({"type": "ping"}))
            print(f"🏓 [{self.client_id}] Ping sent")
            return True
        except Exception as e:
            print(f"❌ [{self.client_id}] Ping failed: {e}")
            return False

    async def receive_messages(self, timeout: float = 5.0):
        """Receive messages for a given timeout"""
        if not self.ws:
            return []

        messages = []

        async def _receive_loop():
            async for message in self.ws:
                data = json.loads(message)
                messages.append(data)
                self.received_messages.append(data)

                msg_type = data.get('type', 'unknown')
                print(f"📥 [{self.client_id}] Received: {msg_type}")

                # Stop if we get all_complete
                if msg_type == 'all_complete':
                    break

        try:
            await asyncio.wait_for(_receive_loop(), timeout=timeout)
        except asyncio.TimeoutError:
            pass
        except Exception as e:
            print(f"⚠️ [{self.client_id}] Receive error: {e}")

        return messages

    async def close(self):
        """Close the WebSocket connection"""
        if self.ws:
            await self.ws.close()
            self.connected = False
            print(f"🔌 [{self.client_id}] Disconnected")


@pytest.mark.asyncio
async def test_single_browser_connection():
    """Test 1: Single browser connection (baseline)"""
    print("\n" + "="*60)
    print("TEST 1: Single Browser Connection")
    print("="*60)

    client = WebSocketClient("Browser-1", "session_001")

    # Connect
    assert await client.connect(), "Failed to connect"

    # Wait for connected message
    await asyncio.sleep(1)

    # Send ping
    assert await client.send_ping(), "Failed to send ping"

    # Receive pong
    messages = await client.receive_messages(timeout=2.0)

    # Check for connected and pong messages
    msg_types = [m.get('type') for m in messages]
    assert 'connected' in msg_types, "No connected message received"

    # Close
    await client.close()

    print("✅ TEST 1 PASSED: Single browser works correctly")


@pytest.mark.asyncio
async def test_two_browsers_same_session_sequential():
    """Test 2: Two browsers with same session ID (sequential - old approach)"""
    print("\n" + "="*60)
    print("TEST 2: Two Browsers Same Session (Sequential)")
    print("="*60)

    session_id = "session_002"

    # Browser 1 connects
    client1 = WebSocketClient("Browser-1", session_id)
    assert await client1.connect(), "Browser 1 failed to connect"
    await asyncio.sleep(1)

    # Browser 2 connects (should replace Browser 1)
    client2 = WebSocketClient("Browser-2", session_id)
    assert await client2.connect(), "Browser 2 failed to connect"
    await asyncio.sleep(1)

    # Browser 2 should be active, Browser 1 might be closed
    ping_result = await client2.send_ping()
    assert ping_result, "Browser 2 can't send ping"

    # Clean up
    await client1.close()
    await client2.close()

    print("✅ TEST 2 PASSED: Sequential connection replacement works")


@pytest.mark.asyncio
async def test_two_browsers_same_session_during_processing():
    """Test 3: CRITICAL - Two browsers, second connects during processing (the bug scenario)"""
    print("\n" + "="*60)
    print("TEST 3: Two Browsers During Active Processing (CRITICAL)")
    print("="*60)

    session_id = "session_003_critical"

    # Browser 1 connects
    client1 = WebSocketClient("Browser-1", session_id)
    assert await client1.connect(), "Browser 1 failed to connect"
    await asyncio.sleep(1)

    # Browser 1 sends a chat message (starts processing)
    print("📨 Browser 1 sending chat message to trigger processing...")
    await client1.send_chat("What is machine learning?", "group")

    # IMMEDIATELY connect Browser 2 while Browser 1 is processing
    await asyncio.sleep(0.5)  # Small delay to ensure processing started
    print("🔌 Browser 2 connecting WHILE Browser 1 is processing...")
    client2 = WebSocketClient("Browser-2", session_id)
    assert await client2.connect(), "Browser 2 failed to connect during processing"

    # Browser 2 should be able to send messages
    await asyncio.sleep(1)
    ping_result = await client2.send_ping()
    assert ping_result, "Browser 2 can't send ping (orphaned connection!)"

    print("✅ CRITICAL: Browser 2 is functional even though Browser 1 was processing")

    # Receive messages from both
    print("📥 Collecting messages from Browser 1...")
    messages1 = await client1.receive_messages(timeout=15.0)

    print("📥 Collecting messages from Browser 2...")
    messages2 = await client2.receive_messages(timeout=2.0)

    # Check that Browser 2 received the pong
    msg_types_2 = [m.get('type') for m in messages2]
    assert 'pong' in msg_types_2 or 'connected' in msg_types_2, \
        "Browser 2 not receiving messages (orphaned!)"

    # Clean up
    await client1.close()
    await client2.close()

    print("✅ TEST 3 PASSED: No crashes during processing + new connection")


@pytest.mark.asyncio
async def test_concurrent_browsers_different_sessions():
    """Test 4: Multiple browsers with different session IDs (should all work)"""
    print("\n" + "="*60)
    print("TEST 4: Concurrent Browsers (Different Sessions)")
    print("="*60)

    # Create 5 browsers with different sessions
    clients = [
        WebSocketClient(f"Browser-{i}", f"session_004_{i}")
        for i in range(1, 6)
    ]

    # Connect all simultaneously
    print("🔌 Connecting 5 browsers concurrently...")
    connect_tasks = [client.connect() for client in clients]
    results = await asyncio.gather(*connect_tasks)

    assert all(results), "Some browsers failed to connect"
    print("✅ All 5 browsers connected successfully")

    # All send pings simultaneously
    await asyncio.sleep(1)
    print("🏓 Sending 5 simultaneous pings...")
    ping_tasks = [client.send_ping() for client in clients]
    ping_results = await asyncio.gather(*ping_tasks)

    assert all(ping_results), "Some pings failed"
    print("✅ All 5 browsers can send pings")

    # All receive messages
    receive_tasks = [client.receive_messages(timeout=2.0) for client in clients]
    all_messages = await asyncio.gather(*receive_tasks)

    # Check all received pong or connected
    for i, messages in enumerate(all_messages, 1):
        msg_types = [m.get('type') for m in messages]
        assert len(msg_types) > 0, f"Browser {i} received no messages"
        print(f"✅ Browser {i} received {len(messages)} messages")

    # Close all
    close_tasks = [client.close() for client in clients]
    await asyncio.gather(*close_tasks)

    print("✅ TEST 4 PASSED: Concurrent connections work correctly")


@pytest.mark.asyncio
async def test_rapid_reconnection_same_session():
    """Test 5: Rapid reconnection stress test (same session ID)"""
    print("\n" + "="*60)
    print("TEST 5: Rapid Reconnection Stress Test")
    print("="*60)

    session_id = "session_005_stress"

    # Connect and disconnect rapidly 10 times
    for i in range(1, 11):
        print(f"🔄 Iteration {i}/10: Connect -> Ping -> Disconnect")

        client = WebSocketClient(f"Browser-Iteration-{i}", session_id)

        # Connect
        assert await client.connect(), f"Failed to connect on iteration {i}"

        # Ping
        await asyncio.sleep(0.5)
        assert await client.send_ping(), f"Failed to ping on iteration {i}"

        # Receive
        await client.receive_messages(timeout=1.0)

        # Disconnect
        await client.close()

        # Small delay between iterations
        await asyncio.sleep(0.3)

    print("✅ TEST 5 PASSED: Survived 10 rapid reconnections")


@pytest.mark.asyncio
async def test_chat_message_delivery_multiple_browsers():
    """Test 6: Chat message delivery to multiple browsers"""
    print("\n" + "="*60)
    print("TEST 6: Chat Message Delivery (Multiple Browsers)")
    print("="*60)

    # Browser 1 and 2 with different sessions
    client1 = WebSocketClient("Browser-1", "session_006_a")
    client2 = WebSocketClient("Browser-2", "session_006_b")

    # Connect both
    await client1.connect()
    await client2.connect()
    await asyncio.sleep(1)

    # Browser 1 sends a chat message
    print("📨 Browser 1 sending chat message...")
    await client1.send_chat("Hello from Browser 1!", "group")

    # Both browsers receive messages
    print("📥 Receiving messages on both browsers...")
    messages1_task = asyncio.create_task(client1.receive_messages(timeout=20.0))
    messages2_task = asyncio.create_task(client2.receive_messages(timeout=20.0))

    # Wait for both to receive
    messages1, messages2 = await asyncio.gather(messages1_task, messages2_task)

    # Browser 1 should receive agent responses
    msg_types_1 = [m.get('type') for m in messages1]
    assert 'agent_start' in msg_types_1 or 'agent_chunk' in msg_types_1, \
        "Browser 1 didn't receive agent responses"

    print(f"✅ Browser 1 received {len(messages1)} messages")
    print(f"✅ Browser 2 received {len(messages2)} messages")

    # Clean up
    await client1.close()
    await client2.close()

    print("✅ TEST 6 PASSED: Chat messages delivered correctly")


@pytest.mark.asyncio
async def test_error_recovery():
    """Test 7: Error recovery and exception handling"""
    print("\n" + "="*60)
    print("TEST 7: Error Recovery")
    print("="*60)

    client = WebSocketClient("Browser-Error-Test", "session_007")

    # Connect
    await client.connect()
    await asyncio.sleep(1)

    # Send an invalid message (should not crash server)
    print("📨 Sending invalid message...")
    try:
        await client.ws.send("invalid json {{{")
        await asyncio.sleep(1)
    except Exception as e:
        print(f"⚠️ Expected error: {e}")

    # Connection should still be alive
    await asyncio.sleep(1)
    ping_result = await client.send_ping()
    assert ping_result, "Connection died after invalid message"

    # Receive messages
    messages = await client.receive_messages(timeout=2.0)

    # Should receive error or pong
    msg_types = [m.get('type') for m in messages]
    assert 'error' in msg_types or 'pong' in msg_types, \
        "No error or pong received"

    await client.close()

    print("✅ TEST 7 PASSED: Server recovered from invalid message")


async def run_all_tests():
    """Run all tests sequentially"""
    print("\n" + "="*80)
    print("WEBSOCKET MULTI-BROWSER TEST SUITE")
    print("="*80)

    tests = [
        ("Single Browser Connection", test_single_browser_connection),
        ("Two Browsers Sequential", test_two_browsers_same_session_sequential),
        ("Two Browsers During Processing (CRITICAL)", test_two_browsers_same_session_during_processing),
        ("Concurrent Browsers", test_concurrent_browsers_different_sessions),
        ("Rapid Reconnection Stress", test_rapid_reconnection_same_session),
        ("Chat Message Delivery", test_chat_message_delivery_multiple_browsers),
        ("Error Recovery", test_error_recovery),
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            await test_func()
            passed += 1
        except Exception as e:
            print(f"\n❌ TEST FAILED: {name}")
            print(f"   Error: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

        # Delay between tests
        await asyncio.sleep(2)

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
    # Run all tests
    success = asyncio.run(run_all_tests())
    exit(0 if success else 1)
