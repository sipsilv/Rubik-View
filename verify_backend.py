from fastapi.testclient import TestClient
from backend.main import app
import os
import sys

# Add project root to sys.path
sys.path.append(os.getcwd())

client = TestClient(app)

def test_health():
    response = client.get("/health")
    print(f"Health Check: {response.status_code} - {response.json()}")
    assert response.status_code == 200

def test_auth_signup():
    # Use a random email to avoid conflict if running multiple times
    import random
    email = f"testuser{random.randint(1000,9999)}@example.com"
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "password123", "full_name": "Test User"}
    )
    print(f"Signup: {response.status_code}")
    if response.status_code != 200:
        print(response.json())
    return email

def test_auth_login(email):
    response = client.post(
        "/api/v1/auth/token",
        data={"username": email, "password": "password123"}
    )
    print(f"Login: {response.status_code}")
    if response.status_code == 200:
        token = response.json()["access_token"]
        print("Token received")
        return token
    else:
        print(response.json())
        return None

def test_stocks(token):
    headers = {"Authorization": f"Bearer {token}"}
    # Get list of stocks
    response = client.get("/api/v1/stocks/", headers=headers)
    print(f"Get Stocks: {response.status_code}")
    if response.status_code == 200:
        stocks = response.json()
        print(f"Found {len(stocks)} stocks")
        if stocks:
            # Get history for first stock
            symbol = stocks[0]
            resp_hist = client.get(f"/api/v1/stocks/{symbol}/history?limit=5", headers=headers)
            print(f"History for {symbol}: {resp_hist.status_code}")

def test_analysis(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/analysis/top-picks?limit=5", headers=headers)
    print(f"Top Picks: {response.status_code}")
    if response.status_code == 200:
        print(response.json())
    else:
        print(response.json())

if __name__ == "__main__":
    try:
        print("--- Starting Backend Verification ---")
        test_health()
        email = test_auth_signup()
        if email:
            token = test_auth_login(email)
            if token:
                test_stocks(token)
                test_analysis(token)
        print("--- Verification Complete ---")
    except Exception as e:
        print(f"Verification Failed: {e}")
