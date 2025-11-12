#!/usr/bin/env python3
"""
Test OpenAI API calls - both sync and async
"""
import asyncio
from openai import OpenAI, AsyncOpenAI
from utils import get_openai_api_key

async def test_async_gpt4o():
    """Test async API call with GPT-4o"""
    print("\n🔵 Testing ASYNC GPT-4o...")
    try:
        client = AsyncOpenAI(api_key=get_openai_api_key())

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'Hello from async GPT-4o!' in exactly 5 words."}
            ],
            temperature=0.7,
            max_tokens=50
        )

        result = response.choices[0].message.content
        print(f"✅ ASYNC GPT-4o SUCCESS: {result}")
        return True
    except Exception as e:
        print(f"❌ ASYNC GPT-4o FAILED: {e}")
        return False

def test_sync_gpt4o():
    """Test sync API call with GPT-4o"""
    print("\n🟢 Testing SYNC GPT-4o...")
    try:
        client = OpenAI(api_key=get_openai_api_key())

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'Hello from sync GPT-4o!' in exactly 5 words."}
            ],
            temperature=0.7,
            max_tokens=50
        )

        result = response.choices[0].message.content
        print(f"✅ SYNC GPT-4o SUCCESS: {result}")
        return True
    except Exception as e:
        print(f"❌ SYNC GPT-4o FAILED: {e}")
        return False

async def test_async_gpt5():
    """Test async API call with GPT-5 (Responses API)"""
    print("\n🔵 Testing ASYNC GPT-5...")
    try:
        client = AsyncOpenAI(api_key=get_openai_api_key())

        # GPT-5 uses the Responses API
        response = await client.responses.create(
            model="gpt-5",
            input="Say 'Hello from async GPT-5!' in exactly 5 words.",
            reasoning={'effort': 'low'},
            text={'verbosity': 'medium'},
            max_output_tokens=50
        )

        result = response.output_text
        print(f"✅ ASYNC GPT-5 SUCCESS: {result}")
        return True
    except Exception as e:
        print(f"❌ ASYNC GPT-5 FAILED: {e}")
        return False

def test_sync_gpt5():
    """Test sync API call with GPT-5 (Responses API)"""
    print("\n🟢 Testing SYNC GPT-5...")
    try:
        client = OpenAI(api_key=get_openai_api_key())

        # GPT-5 uses the Responses API
        response = client.responses.create(
            model="gpt-5",
            input="Say 'Hello from sync GPT-5!' in exactly 5 words.",
            reasoning={'effort': 'low'},
            text={'verbosity': 'medium'},
            max_output_tokens=50
        )

        result = response.output_text
        print(f"✅ SYNC GPT-5 SUCCESS: {result}")
        return True
    except Exception as e:
        print(f"❌ SYNC GPT-5 FAILED: {e}")
        return False

async def main():
    print("=" * 60)
    print("🧪 OPENAI API TEST - Sync vs Async")
    print("=" * 60)

    # Test sync versions
    sync_gpt4o = test_sync_gpt4o()
    sync_gpt5 = test_sync_gpt5()

    # Test async versions
    async_gpt4o = await test_async_gpt4o()
    async_gpt5 = await test_async_gpt5()

    # Summary
    print("\n" + "=" * 60)
    print("📊 RESULTS SUMMARY")
    print("=" * 60)
    print(f"✅ Sync GPT-4o:  {'WORKS' if sync_gpt4o else 'FAILED'}")
    print(f"✅ Async GPT-4o: {'WORKS' if async_gpt4o else 'FAILED'}")
    print(f"{'✅' if sync_gpt5 else '❌'} Sync GPT-5:   {'WORKS' if sync_gpt5 else 'FAILED'}")
    print(f"{'✅' if async_gpt5 else '❌'} Async GPT-5:  {'WORKS' if async_gpt5 else 'FAILED'}")
    print("=" * 60)

    # Recommendation
    if async_gpt4o:
        print("\n🎯 RECOMMENDATION: Use ASYNC for GPT-4o (no threads needed!)")
    else:
        print("\n⚠️ RECOMMENDATION: Stay with SYNC + thread pool for GPT-4o")

    if async_gpt5:
        print("🎯 RECOMMENDATION: Use ASYNC for GPT-5 (no threads needed!)")
    elif sync_gpt5:
        print("⚠️ RECOMMENDATION: Use SYNC + thread pool for GPT-5")
    else:
        print("❌ GPT-5 not available with your API key")

if __name__ == "__main__":
    asyncio.run(main())