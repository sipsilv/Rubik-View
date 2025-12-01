import requests
import json

url = "http://localhost:8000/api/v1/auth/token"
data = {
    "username": "admin@rubikview.com",
    "password": "admin"
}

try:
    print(f"Testing login to: {url}")
    print(f"Credentials: {data['username']}")
    
    response = requests.post(url, data=data)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Body: {response.text}")
    
    if response.status_code == 200:
        token_data = response.json()
        print(f"\n✓ Login successful!")
        print(f"Role: {token_data.get('role')}")
        print(f"Token (first 50 chars): {token_data.get('access_token')[:50]}...")
    else:
        print(f"\n✗ Login failed!")
        
except Exception as e:
    print(f"\nError occurred: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
