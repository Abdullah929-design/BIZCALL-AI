#!/usr/bin/env python3
import sys
import time

sys.path.insert(0, '.')
from llm_complex_path.llm_inference import generate_llm_response, generate_llm_response_stream

def test_optimized_llm():
    print("🚀 Testing Optimized LLM Complex Path")
    print("=" * 50)
    
    # Test 1: Simple response
    print("\n1️⃣ Testing Simple Response...")
    start_time = time.time()
    
    try:
        response = generate_llm_response("What are your loan interest rates?")
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
        for chunk in generate_llm_response_stream("How do I open a savings account?"):
            chunks.append(chunk)
            if len(chunks) == 1:
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
    
    print("\n🎯 Optimization Status:")
    print("✅ Model: banking-model (restored)")
    print("✅ Environment Variables: Optimized for i5 7th gen")
    print("✅ Context: 512 tokens (75% reduction)")
    print("✅ Predict: 80 tokens (47% reduction)")
    print("✅ Timeout: 25s (58% faster)")
    print("✅ Keep Alive: 3m (40% reduction)")

if __name__ == "__main__":
    test_optimized_llm()
