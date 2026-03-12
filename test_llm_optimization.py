#!/usr/bin/env python3
"""
Comprehensive test script for LLM Complex Path optimizations
Optimized for i5 7th Gen, 16GB RAM, Integrated Graphics
"""

import sys
import os
import time

# Add parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from llm_complex_path.llm_inference import (
    generate_llm_response,
    generate_llm_response_stream,
    generate_llm_response_chat,
    generate_llm_response_chat_stream
)

def test_llm_optimization():
    print("🚀 Testing LLM Complex Path - i5 7th Gen Optimizations")
    print("=" * 60)
    
    # Test 1: Simple response
    print("\n1️⃣ Testing Simple Response (Optimized Prompt)...")
    start_time = time.time()
    
    try:
        response = generate_llm_response("How do I check my account balance?")
        end_time = time.time()
        response_time = end_time - start_time
        
        print(f"   ⏱️  Response Time: {response_time:.2f} seconds")
        print(f"   📝 Response Length: {len(response)} characters")
        print(f"   📄 Response: {response}")
        
        if response_time < 8:
            print("   ✅ Excellent (< 8s)")
        elif response_time < 15:
            print("   ⚠️  Good (8-15s)")
        else:
            print("   ❌ Needs improvement (> 15s)")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Streaming response
    print("\n2️⃣ Testing Streaming Response...")
    start_time = time.time()
    
    try:
        chunks = []
        for chunk in generate_llm_response_stream("What are your loan rates?"):
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
        
        if full_response_time < 12:
            print("   ✅ Fast streaming (< 12s)")
        elif full_response_time < 20:
            print("   ⚠️  Moderate streaming (12-20s)")
        else:
            print("   ❌ Slow streaming (> 20s)")
            
    except Exception as e:
        print(f"   ❌ Streaming Error: {e}")
    
    # Test 3: Chat response
    print("\n3️⃣ Testing Chat Response (Session Context)...")
    start_time = time.time()
    
    messages = [
        {"role": "user", "content": "I want to open a savings account"},
        {"role": "assistant", "content": "I can help you open a savings account. What type are you looking for?"},
        {"role": "user", "content": "What are the interest rates?"}
    ]
    
    try:
        response = generate_llm_response_chat(messages, temperature=0.6)
        end_time = time.time()
        response_time = end_time - start_time
        
        print(f"   ⏱️  Chat Response Time: {response_time:.2f} seconds")
        print(f"   📝 Chat Response Length: {len(response)} characters")
        print(f"   📄 Chat Response: {response}")
        
        if response_time < 10:
            print("   ✅ Fast chat (< 10s)")
        elif response_time < 18:
            print("   ⚠️  Moderate chat (10-18s)")
        else:
            print("   ❌ Slow chat (> 18s)")
            
    except Exception as e:
        print(f"   ❌ Chat Error: {e}")
    
    # Test 4: Chat streaming
    print("\n4️⃣ Testing Chat Streaming...")
    start_time = time.time()
    
    try:
        chunks = []
        for chunk in generate_llm_response_chat_stream(messages, temperature=0.6):
            chunks.append(chunk)
            if len(chunks) == 1:
                first_chunk_time = time.time() - start_time
                print(f"   ⚡ First chat chunk: {first_chunk_time:.2f} seconds")
        
        end_time = time.time()
        full_chat_time = end_time - start_time
        full_chat_response = "".join(chunks)
        
        print(f"   ⏱️  Full Chat Time: {full_chat_time:.2f} seconds")
        print(f"   📝 Full Chat Length: {len(full_chat_response)} characters")
        print(f"   📄 Full Chat Response: {full_chat_response}")
        
        if full_chat_time < 15:
            print("   ✅ Fast chat streaming (< 15s)")
        elif full_chat_time < 25:
            print("   ⚠️  Moderate chat streaming (15-25s)")
        else:
            print("   ❌ Slow chat streaming (> 25s)")
            
    except Exception as e:
        print(f"   ❌ Chat Streaming Error: {e}")
    
    print("\n🎯 Optimization Summary for i5 7th Gen:")
    print("✅ Reduced timeout: 60s → 25s")
    print("✅ Reduced context: 2048 → 512 tokens")
    print("✅ Reduced predict: 150 → 80 tokens")
    print("✅ Optimized prompt: Q: format (shorter)")
    print("✅ Memory optimization: f16_kv enabled")
    print("✅ CPU optimization: 4 threads, 512 batch")
    print("✅ Reduced keep_alive: 5m → 3m")
    print("✅ Lower repeat_penalty: 1.1 → 1.05")
    print("✅ Lower top_p: 0.9 → 0.8")
    
    print("\n💡 Hardware-Specific Optimizations:")
    print("- CPU: i5 7th Gen → 4 threads, optimized batch size")
    print("- RAM: 16GB → 512 context, 80 predict limits")
    print("- GPU: Integrated → f16_kv memory optimization")
    print("- Model: Quantized q4_k_m for CPU efficiency")
    
    print("\n📊 Expected Performance:")
    print("- Simple responses: < 8 seconds")
    print("- Streaming first chunk: < 3 seconds")
    print("- Chat responses: < 10 seconds")
    print("- Full streaming: < 15 seconds")
    
    print("\n🔧 To apply optimized model:")
    print("1. Copy optimized_modelfile.txt to ollama_models/Modelfile")
    print("2. Recreate model: ollama create gemma-banking-opt -f Modelfile")
    print("3. Update OLLAMA_MODEL=gemma-banking-opt in environment")

if __name__ == "__main__":
    test_llm_optimization()
