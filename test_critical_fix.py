#!/usr/bin/env python3
"""
Test the critical WebSocket fix in production
This will show us exactly where the failure occurs in the response sending
"""
import asyncio
import websockets
import json
import sys
import time

BACKEND_URL = "wss://kg-student-backend.ambitiouswave-220155c4.eastus2.azurecontainerapps.io/ws"

async def test_production():
    print("🔌 Connecting to production WebSocket...")
    print(f"   URL: {BACKEND_URL}\n")

    try:
        async with websockets.connect(BACKEND_URL) as ws:
            print("✅ Connected successfully\n")

            # Register session
            session_id = f"critical_fix_test_{int(time.time())}"
            await ws.send(json.dumps({
                "type": "register_session",
                "browser_session_id": session_id
            }))
            print(f"📝 Session registered: {session_id}")

            # Send test message
            test_msg = "Hello team! Testing critical WebSocket fix."
            await ws.send(json.dumps({
                "type": "chat",
                "message": test_msg,
                "mode": "group"
            }))
            print(f"💬 Sent message: '{test_msg}'")
            print("⏳ Waiting for responses (max 130s)...\n")

            # Track what we receive
            received_messages = []
            agent_responses = {}
            errors = []
            start = asyncio.get_event_loop().time()

            while True:
                try:
                    elapsed = asyncio.get_event_loop().time() - start
                    if elapsed > 130:
                        print(f"\n⏱️ CLIENT TIMEOUT after {elapsed:.1f}s")
                        break

                    msg = await asyncio.wait_for(ws.recv(), timeout=130 - elapsed)
                    data = json.loads(msg)
                    msg_type = data.get('type')
                    received_messages.append((msg_type, time.time()))

                    # Handle different message types
                    if msg_type == 'agent_typing':
                        agent_id = data.get('agent_id')
                        print(f"⌨️  {agent_id} is typing...")

                    elif msg_type == 'agent_start':
                        agent_id = data.get('agent_id')
                        print(f"🚀 {agent_id} started responding")

                    elif msg_type == 'agent_chunk':
                        agent_id = data.get('agent_id')
                        chunk = data.get('chunk', '')
                        if agent_id not in agent_responses:
                            agent_responses[agent_id] = ""
                        agent_responses[agent_id] += chunk

                    elif msg_type == 'agent_complete':
                        agent_id = data.get('agent_id')
                        full_response = data.get('full_response', '')
                        print(f"✅ {agent_id} complete ({len(full_response)} chars)")
                        if agent_id not in agent_responses:
                            agent_responses[agent_id] = full_response

                    elif msg_type == 'agent_response':
                        # Fallback format
                        agent_id = data.get('agent_id')
                        content = data.get('content', '')
                        print(f"📨 {agent_id} sent response (fallback format)")
                        if agent_id not in agent_responses:
                            agent_responses[agent_id] = content

                    elif msg_type == 'all_complete':
                        elapsed = asyncio.get_event_loop().time() - start
                        print(f"\n🎉 ALL COMPLETE in {elapsed:.1f}s")
                        break

                    elif msg_type == 'error':
                        error_msg = data.get('message', 'Unknown error')
                        errors.append(error_msg)
                        print(f"❌ ERROR: {error_msg}")

                    elif msg_type == 'log_stream':
                        # Backend logs - could be useful
                        log_msg = data.get('message', '')
                        if 'error' in log_msg.lower() or 'fail' in log_msg.lower():
                            print(f"📋 LOG: {log_msg}")

                    elif msg_type == 'keepalive':
                        pass  # Ignore keepalives

                    elif msg_type == 'processing':
                        print("⚙️  Backend processing...")

                    elif msg_type == 'connected':
                        print("🔗 Session confirmed")

                    elif msg_type == 'pong':
                        pass  # Ignore pongs

                    else:
                        print(f"❓ Unknown message type: {msg_type}")

                except asyncio.TimeoutError:
                    print(f"\n⏱️ WEBSOCKET TIMEOUT after 130s")
                    break

            # Final summary
            print("\n" + "=" * 60)
            print("📊 TEST RESULTS")
            print("=" * 60)
            print(f"Total messages received: {len(received_messages)}")
            print(f"Agents that responded: {len(agent_responses)}")
            print(f"Errors encountered: {len(errors)}")

            if agent_responses:
                print("\nAgent Responses:")
                for agent_id, response in agent_responses.items():
                    print(f"  • {agent_id}: {len(response)} chars")
                    if response:
                        preview = response[:100]
                        print(f"    Preview: {preview}...")

            if errors:
                print("\nErrors:")
                for error in errors:
                    print(f"  • {error}")

            print("=" * 60)

            # Determine success
            success = len(agent_responses) > 0 and len(errors) == 0
            return success

    except Exception as e:
        print(f"\n❌ Connection failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("CRITICAL FIX TEST - Production WebSocket")
    print("=" * 60)
    print()

    success = asyncio.run(test_production())

    print()
    if success:
        print("✅ TEST PASSED - WebSocket responses working!")
    else:
        print("❌ TEST FAILED - Check Azure logs for details")

    sys.exit(0 if success else 1)