#!/usr/bin/env python3
"""
Enhanced test to capture all WebSocket messages including agent responses
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
                "browser_session_id": "test_thread_pool_v2"
            }))
            print("📝 Registered session\n")

            # Send test message
            test_msg = "Quick test: What's 2+2?"
            await ws.send(json.dumps({
                "type": "chat",
                "message": test_msg,
                "mode": "group"
            }))
            print(f"💬 Sent message: '{test_msg}'")
            print("⏳ Waiting for responses...\n")

            # Collect all messages
            messages_received = []
            agent_responses = {}
            start_time = asyncio.get_event_loop().time()
            timeout = 45

            while True:
                try:
                    elapsed = asyncio.get_event_loop().time() - start_time
                    if elapsed > timeout:
                        print(f"\n⏱️  TIMEOUT after {timeout}s")
                        break

                    remaining = timeout - elapsed
                    msg = await asyncio.wait_for(ws.recv(), timeout=remaining)
                    data = json.loads(msg)
                    msg_type = data.get('type')
                    messages_received.append((msg_type, data))

                    # Handle different message types
                    if msg_type == 'agent_response':
                        agent = data.get('agent_id', 'unknown')
                        content = data.get('content', '')

                        if agent not in agent_responses:
                            agent_responses[agent] = ""
                        agent_responses[agent] += content

                        # Show first chunk
                        if len(agent_responses[agent]) == len(content):
                            print(f"📨 {agent}: {content[:80]}...")

                    elif msg_type == 'start_response':
                        agent = data.get('agent_id', 'unknown')
                        print(f"⏺️  {agent} started responding")

                    elif msg_type == 'all_complete':
                        print(f"\n🎉 All agents completed! ({elapsed:.1f}s)")
                        print(f"\n📊 RESULTS:")
                        print(f"   Total messages: {len(messages_received)}")
                        print(f"   Agents responded: {len(agent_responses)}")

                        for agent, response in agent_responses.items():
                            print(f"\n   {agent}:")
                            print(f"      Length: {len(response)} chars")
                            print(f"      Preview: {response[:200]}...")

                        return True

                    elif msg_type == 'error':
                        print(f"\n❌ Error: {data.get('message')}")
                        return False

                    elif msg_type == 'pong':
                        pass  # Ignore pongs

                    elif msg_type in ['typing', 'agent_start']:
                        pass  # Ignore typing indicators

                    else:
                        print(f"ℹ️  {msg_type}: {str(data)[:100]}")

                except asyncio.TimeoutError:
                    print(f"\n⏱️  TIMEOUT after {timeout}s")
                    print(f"📊 Partial results:")
                    print(f"   Messages received: {len(messages_received)}")
                    print(f"   Agents started: {len(agent_responses)}")
                    return False

    except Exception as e:
        print(f"\n❌ Connection failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 70)
    print("PRODUCTION WEBSOCKET TEST v2 - Thread Pool Fix Verification")
    print("=" * 70)
    print()

    success = asyncio.run(test_production())

    print()
    print("=" * 70)
    if success:
        print("✅ TEST PASSED - Production WebSocket fully working!")
    else:
        print("❌ TEST FAILED")
    print("=" * 70)

    sys.exit(0 if success else 1)
