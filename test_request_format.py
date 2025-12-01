import requests

# Test with correct content-type header
url = "http://localhost:8000/api/v1/auth/token"
data = {
    "username": "admin@rubikview.com",
    "password": "admin"
}

# Try with different headers
print("=== Test 1: URLEncoded (correct) ===")
headers1 = {"Content-Type": "application/x-www-form-urlencoded"}
response1 = requests.post(url, data=data, headers=headers1)
print(f"Status: {response1.status_code}")
print(f"Response: {response1.text[:200]}")

print("\n=== Test 2: Default (axios behavior) ===")
from urllib.parse import urlencode
encoded_data = urlencode(data)
headers2 = {"Content-Type": "application/x-www-form-urlencoded"}
response2 = requests.post(url, data=encoded_data, headers=headers2)
print(f"Status: {response2.status_code}")
print(f"Response: {response2.text[:200]}")
