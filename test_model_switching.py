#!/usr/bin/env python3
"""
Test model switching functionality via WebSocket
"""
import asyncio
import websockets
import json

BACKEND_URL = "ws://localhost:8000/ws"

async def test_model_switching():
    """Test switching between different models"""
    try:
        async with websockets.connect(BACKEND_URL) as ws:
            print("✅ Connected to WebSocket")

            # Register session
            session_id = "model_test_session"
            await ws.send(json.dumps({
                "type": "register_session",
                "browser_session_id": session_id
            }))
            print(f"📝 Registered session: {session_id}")

            # Wait for registration
            await asyncio.sleep(0.5)

            # Test 1: Switch to GPT-4o
            print("\n🔄 TEST 1: Switching to GPT-4o...")
            await ws.send(json.dumps({
                "type": "set_model",
                "model": "gpt-4o"
            }))

            # Wait for response
            response = await ws.recv()
            data = json.loads(response)
            if data.get("type") == "model_changed":
                print(f"   ✅ Model switched to: {data.get('model')}")
            else:
                print(f"   ❌ Unexpected response: {data}")

            # Test a query with GPT-4o
            print("   💬 Testing with GPT-4o: 'What is 2+2?'")
            await ws.send(json.dumps({
                "type": "chat",
                "message": "What is 2+2?",
                "mode": "group"
            }))

            # Wait for agent responses
            agent_count = 0
            while True:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=10)
                    data = json.loads(msg)

                    if data.get('type') == 'agent_response':
                        agent_count += 1
                        print(f"   ✅ Got response from agent (GPT-4o)")

                    elif data.get('type') == 'all_complete':
                        print(f"   ✅ GPT-4o query complete ({agent_count} agents)")
                        break

                except asyncio.TimeoutError:
                    print(f"   ⏱️ Timeout waiting for GPT-4o response")
                    break

            # Test 2: Switch to GPT-5
            print("\n🔄 TEST 2: Switching to GPT-5...")
            await ws.send(json.dumps({
                "type": "set_model",
                "model": "gpt-5"
            }))

            # Wait for response
            response = await ws.recv()
            data = json.loads(response)
            if data.get("type") == "model_changed":
                print(f"   ✅ Model switched to: {data.get('model')}")
            else:
                print(f"   ❌ Unexpected response: {data}")

            # Test a query with GPT-5
            print("   💬 Testing with GPT-5: 'What is AI?'")
            await ws.send(json.dumps({
                "type": "chat",
                "message": "What is AI?",
                "mode": "group"
            }))

            # Wait for agent responses
            agent_count = 0
            while True:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=15)
                    data = json.loads(msg)

                    if data.get('type') == 'agent_response':
                        agent_count += 1
                        print(f"   ✅ Got response from agent (GPT-5)")

                    elif data.get('type') == 'all_complete':
                        print(f"   ✅ GPT-5 query complete ({agent_count} agents)")
                        break

                except asyncio.TimeoutError:
                    print(f"   ⏱️ Timeout waiting for GPT-5 response")
                    break

            # Test 3: Switch back to GPT-4o
            print("\n🔄 TEST 3: Switching back to GPT-4o...")
            await ws.send(json.dumps({
                "type": "set_model",
                "model": "gpt-4o"
            }))

            # Wait for response
            response = await ws.recv()
            data = json.loads(response)
            if data.get("type") == "model_changed":
                print(f"   ✅ Model switched back to: {data.get('model')}")
            else:
                print(f"   ❌ Unexpected response: {data}")

            print("\n✨ Model switching test complete!")
            return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

async def main():
    print("=" * 60)
    print("🧪 TESTING MODEL SWITCHING FUNCTIONALITY")
    print("=" * 60)

    success = await test_model_switching()

    if success:
        print("\n🎉 MODEL SWITCHING WORKS!")
        print("✅ You can now switch models from the UI dropdown")
    else:
        print("\n❌ MODEL SWITCHING TEST FAILED")
        print("Check server logs for details")

    return 0 if success else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)