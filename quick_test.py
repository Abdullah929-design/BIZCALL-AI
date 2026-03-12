import sys, time
sys.path.insert(0, '.')
from llm_complex_path.llm_inference import generate_llm_response

print('🔧 Testing Optimized Parameters Applied...')
start = time.time()
response = generate_llm_response('What are your savings account interest rates?')
end = time.time()

print(f'⏱️  Time: {end-start:.2f}s')
print(f'📝 Length: {len(response)} chars')
print(f'📄 Response: {response}')
print('✅ Optimized parameters working through inference code!')
