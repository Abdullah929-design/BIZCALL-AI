#!/usr/bin/env python3
"""
Test script to verify marketing LLM speed optimization
"""

import sys
import os
import time

# Add parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from llm_marketing_path.marketing_inference import (
    generate_marketing_chat_response,
    generate_marketing_chat_response_stream
)

def test_marketing_speed():
    print("🧪 Testing Marketing LLM Speed Optimization...")
    
    # Test 1: Simple blocking response
    print("\n1️⃣ Testing simple blocking response...")
    start_time = time.time()
    
    messages = [
        {"role": "user", "content": "Do you offer business accounts?"}
    ]
    
    try:
        response = generate_marketing_chat_response(
            messages=messages,
            business_context="We are a community bank serving small businesses",
            temperature=0.7
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        print(f"   ⏱️  Response Time: {response_time:.2f} seconds")
        print(f"   📝 Response Length: {len(response)} characters")
        print(f"   📄 Response: {response}")
        
        if response_time < 10:
            print("   ✅ Fast response (< 10s)")
        elif response_time < 20:
            print("   ⚠️  Moderate response (10-20s)")
        else:
            print("   ❌ Slow response (> 20s)")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Streaming response
    print("\n2️⃣ Testing streaming response...")
    start_time = time.time()
    
    try:
        chunks = []
        for chunk in generate_marketing_chat_response_stream(
            messages=messages,
            business_context="We are a community bank serving small businesses", 
            temperature=0.7
        ):
            chunks.append(chunk)
            if len(chunks) == 1:  # First chunk timing
                first_chunk_time = time.time() - start_time
                print(f"   ⚡ First chunk: {first_chunk_time:.2f} seconds")
        
        end_time = time.time()
        full_response_time = end_time - start_time
        full_response = "".join(chunks)
        
        print(f"   ⏱️  Full Response Time: {full_response_time:.2f} seconds")
        print(f"   📝 Full Response Length: {len(full_response)} characters")
        print(f"   📄 Full Response: {full_response}")
        
        if full_response_time < 15:
            print("   ✅ Fast streaming (< 15s)")
        elif full_response_time < 30:
            print("   ⚠️  Moderate streaming (15-30s)")
        else:
            print("   ❌ Slow streaming (> 30s)")
            
    except Exception as e:
        print(f"   ❌ Streaming Error: {e}")
    
    print("\n🎯 Optimization Summary:")
    print("- Reduced timeout from 180s to 30s")
    print("- Reduced context from 768 to 512")
    print("- Reduced predict from 256 to 128") 
    print("- Simplified system prompt for direct responses")
    print("- Removed retry logic for faster execution")
    print("- Focused on outbound agent behavior")

if __name__ == "__main__":
    test_marketing_speed()
