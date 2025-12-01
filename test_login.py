import requests

url = "http://localhost:8000/api/v1/auth/token"
data = {
    "username": "admin@rubikview.com",
    "password": "admin"
}

try:
    response = requests.post(url, data=data)
    print(f"Login Status Code: {response.status_code}")
    if response.status_code == 200:
        token = response.json()["access_token"]
        role = response.json().get("role")
        print(f"Token obtained. Role: {role}")
        
        # Test Analysis Endpoint
        analysis_url = "http://localhost:8000/api/v1/analysis/top-picks?limit=5"
        headers = {"Authorization": f"Bearer {token}"}
        print(f"Requesting: {analysis_url}")
        analysis_res = requests.get(analysis_url, headers=headers)
        print(f"Analysis Status Code: {analysis_res.status_code}")
        print(f"Analysis Data: {analysis_res.text[:200]}...") # Print first 200 chars
    else:
        print(f"Login Failed: {response.text}")

except Exception as e:
    print(f"Error: {e}")
