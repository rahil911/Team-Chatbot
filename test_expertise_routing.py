#!/usr/bin/env python3
"""Test WebSocket expertise-based routing"""

import asyncio
import websockets
import json

async def test_expertise_routing():
    uri = "ws://localhost:8000/ws"

    print("\n" + "="*80)
    print("TESTING EXPERTISE-BASED ROUTING")
    print("="*80 + "\n")

    async with websockets.connect(uri) as websocket:
        print("✅ Connected to WebSocket")

        # Send technical question that should route to multiple agents
        message = {
            "type": "chat",
            "message": "Tell me about the cloud infrastructure and data pipelines you've built",
            "mode": "group"
        }

        print(f"\n📤 Sending: {message}")
        await websocket.send(json.dumps(message))

        print("\n📥 Receiving responses:")
        print("-" * 80)

        agent_responses = []

        # Receive responses
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

                elif msg_type == "agent_complete":
                    agent_id = data.get("agent_id")
                    print(f"✅ {agent_id} complete")

                elif msg_type == "all_complete":
                    print("\n" + "="*80)
                    print("ALL AGENTS COMPLETE")
                    print("="*80)
                    break

                await asyncio.sleep(0.01)

        except asyncio.TimeoutError:
            print("\n⏱️  Timeout waiting for responses")

        print("\n" + "="*80)
        print("SUMMARY")
        print("="*80)
        print(f"\nAgents that responded: {[a[0] for a in agent_responses]}")
        print(f"Expected: Should include 'mathew' (cloud/data expert)")

        # Verify Mathew responded (since question is about cloud infrastructure)
        if 'mathew' in [a[0] for a in agent_responses]:
            print("\n✅ CORRECT: Mathew (cloud/data expert) responded")
        else:
            print(f"\n❌ WRONG: Expected Mathew to respond, but got {[a[0] for a in agent_responses]}")

        # Verify no excessive duplication
        if len(agent_responses) <= 4:
            print("✅ CORRECT: No excessive duplication (max 4 agents)")
        else:
            print(f"❌ WRONG: Too many responses ({len(agent_responses)} agents)")

if __name__ == "__main__":
    asyncio.run(test_expertise_routing())
