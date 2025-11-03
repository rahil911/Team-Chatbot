#!/usr/bin/env python3
"""Test LLM routing for greetings"""

import sys
sys.path.insert(0, '/Users/rahilharihar/Projects/tbd/kg')

from intent_router import IntentRouter
from agents import OpenAIClient
from dotenv import load_dotenv

load_dotenv()

# Initialize
openai_client = OpenAIClient(use_gpt5=False)
router = IntentRouter(openai_client)

# Test greetings
test_queries = [
    "Hey there!",
    "hi",
    "Bonjour",
    "Hola amigos",
    "Namaste",
]

print("\n" + "="*80)
print("TESTING LLM ROUTING FOR GREETINGS")
print("="*80 + "\n")

for query in test_queries:
    print(f"\n{'='*80}")
    print(f"Query: '{query}'")
    print(f"{'='*80}")

    try:
        routing_decision = router.route_user_query(query, [])

        print(f"\n✅ ROUTING DECISION:")
        print(f"   Agents: {routing_decision.agent_ids}")
        print(f"   Reasoning: {routing_decision.reasoning}")
        print(f"   Is Targeted: {routing_decision.is_targeted}")
        print(f"   Confidence: {routing_decision.confidence}")
        print(f"   Context/Intent: {routing_decision.context}")

        # Check if correct
        if routing_decision.context == "greeting":
            if routing_decision.agent_ids == ["rahil"]:
                print(f"\n   ✅ CORRECT: Only Rahil should respond to greetings")
            else:
                print(f"\n   ❌ WRONG: Should be ['rahil'] but got {routing_decision.agent_ids}")
        else:
            print(f"\n   ❌ WRONG: Context should be 'greeting' but got '{routing_decision.context}'")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

print("\n" + "="*80)
print("TEST COMPLETE")
print("="*80 + "\n")
