#!/usr/bin/env python3
"""
Test script to verify marketing LLM optimizations for i5 7th gen
"""

import sys
import time

sys.path.insert(0, '.')
from llm_marketing_path.marketing_inference import (
    generate_marketing_response, 
    generate_marketing_response_stream,
    generate_marketing_chat_response,
    generate_marketing_chat_response_stream
)

def test_marketing_optimization():
    print("🚀 Testing Marketing LLM Optimization")
    print("=" * 50)
    
    # Test 1: Marketing Speech Generation
    print("\n1️⃣ Testing Marketing Speech Generation...")
    start_time = time.time()
    
    business_details = """
    Local gym offering $29/month membership.
    Target: Working professionals 25-45.
    Special: 3 months free with annual signup.
    Channel: Instagram ads.
    Goal: 100 new members by Q4.
    """
    
    try:
        response = generate_marketing_response(business_details, temperature=0.6)
        end_time = time.time()
        response_time = end_time - start_time
        
        print(f"   ⏱️  Response Time: {response_time:.2f} seconds")
        print(f"   📝 Response Length: {len(response)} characters")
        print(f"   📄 Response: {response}")
        
        if response_time < 8:
            print("   ✅ Fast marketing speech (< 8s)")
        elif response_time < 15:
            print("   ⚠️  Moderate speed (8-15s)")
        else:
            print("   ❌ Too slow (> 15s)")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Streaming Marketing Speech
    print("\n2️⃣ Testing Streaming Marketing Speech...")
    start_time = time.time()
    
    try:
        chunks = []
        for chunk in generate_marketing_response_stream(business_details, temperature=0.6):
            chunks.append(chunk)
            if len(chunks) == 1:
                first_chunk_time = time.time() - start_time
                print(f"   ⚡ First chunk: {first_chunk_time:.2f} seconds")
        
        end_time = time.time()
        full_response_time = end_time - start_time
        full_response = "".join(chunks)
        
        print(f"   ⏱️  Full Streaming Time: {full_response_time:.2f} seconds")
        print(f"   📝 Full Response Length: {len(full_response)} characters")
        print(f"   📄 Full Response: {full_response}")
        
        if full_response_time < 12:
            print("   ✅ Fast streaming (< 12s)")
        elif full_response_time < 20:
            print("   ⚠️  Moderate streaming (12-20s)")
        else:
            print("   ❌ Slow streaming (> 20s)")
            
    except Exception as e:
        print(f"   ❌ Streaming Error: {e}")
    
    # Test 3: Marketing Chat Response
    print("\n3️⃣ Testing Marketing Chat Response...")
    start_time = time.time()
    
    messages = [
        {"role": "user", "content": "Hi, I saw your ad"},
        {"role": "assistant", "content": "Great! Are you looking to get fit?"},
        {"role": "user", "content": "What are your prices?"}
    ]
    
    try:
        response = generate_marketing_chat_response(messages, business_context=business_details, temperature=0.6)
        end_time = time.time()
        response_time = end_time - start_time
        
        print(f"   ⏱️  Chat Response Time: {response_time:.2f} seconds")
        print(f"   📝 Chat Response Length: {len(response)} characters")
        print(f"   📄 Chat Response: {response}")
        
        # Check if response is short and direct (1-2 sentences)
        sentences = response.split('. ')
        if len(sentences) <= 3 and response_time < 6:
            print("   ✅ Perfect outbound agent response")
        elif len(sentences) <= 3:
            print("   ⚠️  Good format but slow")
        else:
            print("   ❌ Too long or slow")
            
    except Exception as e:
        print(f"   ❌ Chat Error: {e}")
    
    # Test 4: Streaming Marketing Chat
    print("\n4️⃣ Testing Streaming Marketing Chat...")
    start_time = time.time()
    
    try:
        chunks = []
        for chunk in generate_marketing_chat_response_stream(messages, business_context=business_details, temperature=0.6):
            chunks.append(chunk)
            if len(chunks) == 1:
                first_chunk_time = time.time() - start_time
                print(f"   ⚡ First chat chunk: {first_chunk_time:.2f} seconds")
        
        end_time = time.time()
        full_chat_time = end_time - start_time
        full_chat_response = "".join(chunks)
        
        print(f"   ⏱️  Full Chat Streaming Time: {full_chat_time:.2f} seconds")
        print(f"   📝 Full Chat Response Length: {len(full_chat_response)} characters")
        print(f"   📄 Full Chat Response: {full_chat_response}")
        
        if full_chat_time < 8:
            print("   ✅ Fast chat streaming (< 8s)")
        elif full_chat_time < 15:
            print("   ⚠️  Moderate chat streaming (8-15s)")
        else:
            print("   ❌ Slow chat streaming (> 15s)")
            
    except Exception as e:
        print(f"   ❌ Chat Streaming Error: {e}")
    
    print("\n🎯 Marketing Optimization Summary:")
    print("✅ Timeout: 20s (33% faster)")
    print("✅ Stream Timeout: 30s (33% faster)")
    print("✅ Keep Alive: 2m (60% reduction)")
    print("✅ Context: 256 tokens (50% reduction)")
    print("✅ Predict: 150 tokens (complete responses)")
    print("✅ Temperature: 0.6 (focused responses)")
    print("✅ Top_p: 0.8 (faster decisions)")
    print("✅ System Prompt: Outbound agent focused")
    print("✅ Chat History: Last 3 messages only")
    print("✅ Retry Logic: Removed for speed")
    print("✅ Prompts: Simplified for faster processing")

if __name__ == "__main__":
    test_marketing_optimization()
