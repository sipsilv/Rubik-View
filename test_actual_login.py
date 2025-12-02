import requests

url = "http://localhost:8000/api/v1/auth/token"

# Using actual admin credentials from database
data = {
    "username": "jallusandeep@rubikview.com",
    "password": "admin"  # Assuming this is the password
}

print(f"Testing login to: {url}")
print(f"Email: {data['username']}")

try:
    response = requests.post(url, data=data, timeout=5)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        token_data = response.json()
        print(f"\n✓ Login successful!")
        print(f"Role: {token_data.get('role')}")
        print(f"Token type: {token_data.get('token_type')}")
        print(f"Access token (first 50 chars): {token_data.get('access_token')[:50]}...")
    else:
        print(f"\n✗ Login failed!")
        
except requests.exceptions.Timeout:
    print("\n✗ Request timed out! Backend might not be responding.")
except requests.exceptions.ConnectionError:
    print("\n✗ Could not connect! Is the backend server running?")
except Exception as e:
    print(f"\n✗ Error: {type(e).__name__}: {e}")
