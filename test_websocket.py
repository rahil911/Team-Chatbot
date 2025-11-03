#!/usr/bin/env python3
"""Test WebSocket greeting routing"""

import asyncio
import websockets
import json

async def test_greeting():
    uri = "ws://localhost:8000/ws"

    print("\n" + "="*80)
    print("TESTING WEBSOCKET GREETING ROUTING")
    print("="*80 + "\n")

    async with websockets.connect(uri) as websocket:
        print("✅ Connected to WebSocket")

        # Send greeting message
        message = {
            "type": "chat",
            "message": "Hey there!",
            "mode": "group"
        }

        print(f"\n📤 Sending: {message}")
        await websocket.send(json.dumps(message))

        print("\n📥 Receiving responses:")
        print("-" * 80)

        agent_responses = []

        # Receive responses (timeout after 30 seconds or when done)
        timeout = 30
        start_time = asyncio.get_event_loop().time()

        try:
            async for response in websocket:
                data = json.loads(response)
                msg_type = data.get("type")

                # Check timeout
                if asyncio.get_event_loop().time() - start_time > timeout:
                    print("\n⏱️  Timeout after 30 seconds")
                    break

                if msg_type == "agent_start":
                    agent_id = data.get("agent_id")
                    if agent_id not in [a[0] for a in agent_responses]:
                        agent_responses.append((agent_id, ""))
                        print(f"\n🤖 Agent: {agent_id} started")

                elif msg_type == "agent_chunk":
                    agent_id = data.get("agent_id")
                    chunk = data.get("chunk", "")
                    # Just print first chunk
                    if agent_id in [a[0] for a in agent_responses]:
                        idx = [a[0] for a in agent_responses].index(agent_id)
                        if len(agent_responses[idx][1]) < 50:  # Only print first 50 chars
                            print(f"   First chunk: {chunk[:50]}...")

                elif msg_type == "agent_complete":
                    agent_id = data.get("agent_id")
                    print(f"✅ {agent_id} complete")

                elif msg_type == "all_complete":
                    print("\n" + "="*80)
                    print("ALL AGENTS COMPLETE")
                    print("="*80)
                    break

                # Safety timeout
                await asyncio.sleep(0.01)

        except asyncio.TimeoutError:
            print("\n⏱️  Timeout waiting for responses")

        print("\n" + "="*80)
        print("SUMMARY")
        print("="*80)
        print(f"\nAgents that responded: {[a[0] for a in agent_responses]}")
        print(f"Expected: ['rahil']")

        if agent_responses == [('rahil',)] or (len(agent_responses) > 0 and agent_responses[0][0] == 'rahil' and len([a for a in agent_responses if a[0] != 'rahil']) == 0):
            print("\n✅ CORRECT: Only Rahil responded")
        else:
            print(f"\n❌ WRONG: Expected only Rahil, but got {[a[0] for a in agent_responses]}")

if __name__ == "__main__":
    asyncio.run(test_greeting())
