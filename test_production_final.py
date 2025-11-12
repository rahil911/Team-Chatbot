#!/usr/bin/env python3
"""
Final production test with 120s timeout
"""
import asyncio
import websockets
import json
import sys

BACKEND_URL = "wss://kg-student-backend.ambitiouswave-220155c4.eastus2.azurecontainerapps.io/ws"

async def test_production():
    print("🔌 Connecting to production WebSocket...")

    try:
        async with websockets.connect(BACKEND_URL) as ws:
            print("✅ Connected\n")

            # Register
            await ws.send(json.dumps({
                "type": "register_session",
                "browser_session_id": "final_test_120s"
            }))

            # Send message
            test_msg = "Hi! Final test with 120s timeout."
            await ws.send(json.dumps({
                "type": "chat",
                "message": test_msg,
                "mode": "group"
            }))
            print(f"💬 Sent: '{test_msg}'")
            print("⏳ Waiting (max 130s)...\n")

            agent_responses = {}
            start = asyncio.get_event_loop().time()

            while True:
                try:
                    elapsed = asyncio.get_event_loop().time() - start
                    if elapsed > 130:
                        print(f"\n❌ CLIENT TIMEOUT after {elapsed:.1f}s")
                        return False

                    msg = await asyncio.wait_for(ws.recv(), timeout=130 - elapsed)
                    data = json.loads(msg)
                    msg_type = data.get('type')

                    if msg_type == 'agent_response':
                        agent = data.get('agent_id', 'unknown')
                        content = data.get('content', '')

                        if agent not in agent_responses:
                            agent_responses[agent] = ""
                            print(f"📨 {agent} responding...")

                        agent_responses[agent] += content

                    elif msg_type == 'all_complete':
                        elapsed = asyncio.get_event_loop().time() - start
                        print(f"\n✅ COMPLETE in {elapsed:.1f}s")
                        print(f"\n📊 Results:")
                        print(f"   Agents: {len(agent_responses)}")

                        for agent, response in agent_responses.items():
                            print(f"   • {agent}: {len(response)} chars")

                        return len(agent_responses) > 0

                    elif msg_type == 'error':
                        print(f"\n❌ Backend error: {data.get('message')}")
                        return False

                except asyncio.TimeoutError:
                    print(f"\n❌ WS TIMEOUT after 130s")
                    return False

    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("PRODUCTION TEST - 120s Timeout")
    print("=" * 60)
    print()

    success = asyncio.run(test_production())

    print()
    print("=" * 60)
    if success:
        print("✅ TEST PASSED - Production WebSocket WORKS!")
    else:
        print("❌ TEST FAILED")
    print("=" * 60)

    sys.exit(0 if success else 1)
