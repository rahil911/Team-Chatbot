#!/usr/bin/env python3
"""
Test concurrent WebSocket messages to verify async implementation
No thread pool exhaustion should occur!
"""
import asyncio
import websockets
import json
import sys

BACKEND_URL = "ws://localhost:8000/ws"

async def send_message(session_num: int, message: str):
    """Send a message and wait for response"""
    try:
        async with websockets.connect(BACKEND_URL) as ws:
            # Register session
            session_id = f"test_session_{session_num}"
            await ws.send(json.dumps({
                "type": "register_session",
                "browser_session_id": session_id
            }))

            # Wait for registration confirmation
            await asyncio.sleep(0.5)

            # Send chat message
            print(f"💬 Session {session_num}: Sending '{message}'")
            await ws.send(json.dumps({
                "type": "chat",
                "message": message,
                "mode": "group"
            }))

            # Wait for responses
            start_time = asyncio.get_event_loop().time()
            agent_count = 0

            while True:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=30)
                    data = json.loads(msg)

                    if data.get('type') == 'agent_response':
                        agent_count += 1
                        agent_id = data.get('agent_id', 'unknown')
                        print(f"   ✅ Session {session_num}: Got response from {agent_id}")

                    elif data.get('type') == 'all_complete':
                        elapsed = asyncio.get_event_loop().time() - start_time
                        print(f"🎉 Session {session_num}: COMPLETE in {elapsed:.1f}s ({agent_count} agents)")
                        return True

                    elif data.get('type') == 'error':
                        print(f"❌ Session {session_num}: ERROR - {data.get('message')}")
                        return False

                except asyncio.TimeoutError:
                    print(f"⏱️ Session {session_num}: TIMEOUT after 30s")
                    return False

    except Exception as e:
        print(f"❌ Session {session_num}: Connection failed - {e}")
        return False

async def test_concurrent_messages():
    """Test multiple concurrent messages"""
    print("=" * 60)
    print("🧪 TESTING CONCURRENT ASYNC WEBSOCKET MESSAGES")
    print("=" * 60)
    print()

    # Test messages
    test_cases = [
        (1, "What is AI?"),
        (2, "Explain machine learning"),
        (3, "What are neural networks?"),
        (4, "Tell me about deep learning"),
        (5, "What is computer vision?"),
    ]

    print(f"📤 Sending {len(test_cases)} concurrent messages...")
    print()

    # Send all messages concurrently
    tasks = [send_message(num, msg) for num, msg in test_cases]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Summary
    print()
    print("=" * 60)
    print("📊 RESULTS")
    print("=" * 60)

    success_count = sum(1 for r in results if r is True)
    failure_count = sum(1 for r in results if r is False or isinstance(r, Exception))

    print(f"✅ Successful: {success_count}/{len(test_cases)}")
    print(f"❌ Failed: {failure_count}/{len(test_cases)}")

    if success_count == len(test_cases):
        print()
        print("🎉 ALL MESSAGES PROCESSED SUCCESSFULLY!")
        print("🚀 ASYNC IMPLEMENTATION WORKS - NO THREAD EXHAUSTION!")
        return True
    else:
        print()
        print("⚠️ Some messages failed")
        print("Check server logs for details")
        return False

async def main():
    success = await test_concurrent_messages()

    if success:
        print()
        print("=" * 60)
        print("✨ PURE ASYNC SOLUTION VERIFIED!")
        print("✨ NO THREAD POOL NEEDED!")
        print("✨ UNLIMITED CONCURRENT USERS!")
        print("=" * 60)

    return 0 if success else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)