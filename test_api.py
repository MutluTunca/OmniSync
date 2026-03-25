import requests

BASE_URL = "http://localhost:8000/api/v1"

def test_user_visibility():
    # 1. Login
    login_data = {
        "email": "owner@omnisync.life",
        "password": "ChangeMe123!"
    }
    r = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if r.status_code != 200:
        print(f"Login failed: {r.text}")
        return
    
    token = r.json()["access_token"]
    print(f"Logged in successfully. Token: {token[:10]}...")

    # 2. Get Users
    r = requests.get(f"{BASE_URL}/users", headers={"Authorization": f"Bearer {token}"})
    if r.status_code != 200:
        print(f"Get users failed: {r.text}")
        return
    
    data = r.json()
    users = data.get("items", [])
    print(f"Total Users Found: {len(users)}")
    for u in users:
        print(f" - {u['email']} ({u['role']})")

if __name__ == "__main__":
    test_user_visibility()
