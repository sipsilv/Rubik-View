import requests

url = "http://localhost:8000/api/v1/auth/token"

print("=" * 60)
print("Testing Login with Correct Credentials")
print("=" * 60)

# Test with the correct superadmin credentials
data = {
    "username": "jallusandeep@rubikview.com",
    "password": "8686504620SAn@#1"
}

print(f"\nEndpoint: {url}")
print(f"Email: {data['username']}")
print(f"Testing...\n")

try:
    response = requests.post(url, data=data, timeout=10)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        token_data = response.json()
        print("\n✓ ✓ ✓ LOGIN SUCCESSFUL! ✓ ✓ ✓\n")
        print(f"  Role: {token_data.get('role')}")
        print(f"  Token Type: {token_data.get('token_type')}")
        print(f"  Access Token (first 50 chars): {token_data.get('access_token')[:50]}...")
    elif response.status_code == 401:
        print("\n✗ LOGIN FAILED: Incorrect username or password")
        print(f"Response: {response.text}")
    else:
        print(f"\n✗ Unexpected response")
        print(f"Response: {response.text}")
        
except requests.exceptions.Timeout:
    print("\n✗ Request timed out!")
    print("   - Backend might not be fully started")
    print("   - Check if uvicorn is running on port 8000")
except requests.exceptions.ConnectionError:
    print("\n✗ Connection Error!")
    print("   - Backend server is NOT running")
    print("   - Start with: uvicorn backend.main:app --reload")
except Exception as e:
    print(f"\n✗ Error: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
