#!/usr/bin/env python3
"""
Quick test script to verify production WebSocket works with thread pool fix
"""
import asyncio
import websockets
import json
import sys

BACKEND_URL = "wss://kg-student-backend.ambitiouswave-220155c4.eastus2.azurecontainerapps.io/ws"

async def test_production():
    print("🔌 Connecting to production WebSocket...")
    print(f"   URL: {BACKEND_URL}")

    try:
        async with websockets.connect(BACKEND_URL) as ws:
            print("✅ Connected successfully")

            # Register session
            await ws.send(json.dumps({
                "type": "register_session",
                "browser_session_id": "test_thread_pool_fix"
            }))
            print("📝 Registered session")

            # Send test message
            test_msg = "Hi team! Testing thread pool fix in production."
            await ws.send(json.dumps({
                "type": "chat",
                "message": test_msg,
                "mode": "group"
            }))
            print(f"💬 Sent message: '{test_msg}'")
            print("⏳ Waiting for response (max 45 seconds)...\n")

            # Wait for responses
            responses = []
            start_time = asyncio.get_event_loop().time()
            timeout = 45  # Match frontend timeout

            while True:
                try:
                    # Check timeout
                    elapsed = asyncio.get_event_loop().time() - start_time
                    if elapsed > timeout:
                        print(f"\n⏱️  TIMEOUT after {timeout}s")
                        break

                    # Wait for message with remaining timeout
                    remaining = timeout - elapsed
                    msg = await asyncio.wait_for(ws.recv(), timeout=remaining)
                    data = json.loads(msg)

                    msg_type = data.get('type')

                    if msg_type == 'agent_response':
                        agent = data.get('agent_id', 'unknown')
                        content = data.get('content', '')[:100]  # First 100 chars
                        responses.append(agent)
                        print(f"✅ Response from {agent}: {content}...")

                    elif msg_type == 'all_complete':
                        print(f"\n🎉 All agents completed!")
                        print(f"   Agents responded: {', '.join(responses)}")
                        print(f"   Time elapsed: {elapsed:.1f}s")
                        return True

                    elif msg_type == 'error':
                        print(f"\n❌ Error: {data.get('message')}")
                        return False

                except asyncio.TimeoutError:
                    print(f"\n⏱️  TIMEOUT - No response after {timeout}s")
                    return False

    except Exception as e:
        print(f"\n❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("PRODUCTION WEBSOCKET TEST - Thread Pool Fix Verification")
    print("=" * 60)
    print()

    success = asyncio.run(test_production())

    print()
    print("=" * 60)
    if success:
        print("✅ TEST PASSED - Production WebSocket working!")
    else:
        print("❌ TEST FAILED - Production WebSocket still timing out")
    print("=" * 60)

    sys.exit(0 if success else 1)
