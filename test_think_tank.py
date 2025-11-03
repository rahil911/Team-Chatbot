#!/usr/bin/env python3
"""
Test Think Tank Mode Backend
Sends a complex query via WebSocket and monitors responses
"""
import asyncio
import websockets
import json

async def test_think_tank():
    uri = "ws://localhost:8000/ws"

    # Complex query to trigger o1-mini reasoning model
    test_query = """
    Analyze how we can build a scalable AI-powered BI dashboard.
    Consider the tradeoffs between different architectures,
    evaluate the pros and cons of microservices vs monolith,
    and provide a systematic approach with implementation steps.
    """

    print("=" * 60)
    print("TESTING THINK TANK MODE")
    print("=" * 60)
    print(f"\nQuery (complex - should trigger o1-mini):\n{test_query}\n")
    print("=" * 60)

    async with websockets.connect(uri) as websocket:
        # Send think tank mode message
        message = {
            "type": "chat",
            "message": test_query.strip(),
            "mode": "think_tank"
        }

        await websocket.send(json.dumps(message))
        print("✅ Message sent to backend\n")
        print("📡 Receiving responses...\n")
        print("=" * 60)

        round_num = 0
        agent_responses = {}
        citations_found = []
        consensus_scores = []

        try:
            async for message in websocket:
                data = json.loads(message)
                msg_type = data.get("type")

                # System messages (metadata)
                if msg_type == "think_tank_system":
                    system_type = data.get("type")

                    if system_type == "round_start":
                        round_num = data.get("round", 0)
                        print(f"\n🔄 ROUND {round_num} STARTED")
                        print("-" * 60)

                    elif system_type == "citations":
                        agent_id = data.get("agent_id")
                        citations = data.get("citations", [])
                        citations_found.extend(citations)
                        print(f"📝 [{agent_id.upper()}] Citations: {len(citations)} nodes")
                        for cit in citations:
                            print(f"   • {cit.get('original', '')}")

                    elif system_type == "consensus_update":
                        consensus = data.get("consensus", 0)
                        consensus_scores.append(consensus)
                        print(f"\n🎯 Consensus Score: {consensus:.0%}")

                    elif system_type == "round_complete":
                        agents_count = data.get("agents_responded", 0)
                        print(f"✅ Round {round_num} complete ({agents_count} agents)")
                        print("-" * 60)

                    elif system_type == "summary_start":
                        rounds = data.get("rounds_completed", 0)
                        print(f"\n📝 FINAL SUMMARY (after {rounds} rounds)")
                        print("=" * 60)

                # Agent responses
                elif msg_type == "agent_response":
                    agent_id = data.get("agent_id")
                    chunk = data.get("chunk", "")

                    if agent_id not in agent_responses:
                        agent_responses[agent_id] = ""
                        print(f"\n💬 [{agent_id.upper()}]:")

                    agent_responses[agent_id] += chunk
                    print(chunk, end="", flush=True)

                # Final summary
                elif msg_type == "think_tank_summary":
                    chunk = data.get("chunk", "")
                    print(chunk, end="", flush=True)

                # Completion
                elif msg_type == "response_complete":
                    if data.get("final_summary"):
                        print("\n" + "=" * 60)
                        print("✅ THINK TANK COMPLETE")
                        print("=" * 60)
                        print(f"\n📊 STATS:")
                        print(f"   • Agents participated: {len(agent_responses)}")
                        print(f"   • Total citations: {len(citations_found)}")
                        print(f"   • Consensus scores: {[f'{s:.0%}' for s in consensus_scores]}")
                        print(f"   • Final consensus: {consensus_scores[-1]:.0%}" if consensus_scores else "   • No consensus data")
                        break

        except Exception as e:
            print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_think_tank())
