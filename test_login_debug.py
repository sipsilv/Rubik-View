"""
Debug script to check database state and test login
Run: python test_login_debug.py
"""
import sqlite3
import os

# Check database
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rubikview_users.db")

print(f"Database path: {DB_PATH}")
print(f"Database exists: {os.path.exists(DB_PATH)}")

if not os.path.exists(DB_PATH):
    print("\n❌ Database file does not exist! Run: python create_admin_user.py")
    exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check tables
print("\n--- Tables in database ---")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
for t in tables:
    print(f"  - {t[0]}")

# Check users
print("\n--- Users in database ---")
try:
    cursor.execute("SELECT id, email, role, is_active FROM users;")
    users = cursor.fetchall()
    if not users:
        print("  No users found!")
    for u in users:
        print(f"  ID: {u[0]}, Email: {u[1]}, Role: {u[2]}, Active: {u[3]}")
except Exception as e:
    print(f"  Error reading users: {e}")

# Test password verification
print("\n--- Testing password hash ---")
try:
    from backend.core.security import get_password_hash, verify_password
    from backend.core.config import settings
    
    cursor.execute("SELECT email, hashed_password FROM users WHERE email=?", (settings.SUPERADMIN_EMAIL,))
    result = cursor.fetchone()
    
    if result:
        email, stored_hash = result
        print(f"  Found user: {email}")
        print(f"  Hash length: {len(stored_hash)}")
        print(f"  Hash starts with: {stored_hash[:20]}...")
        
        # Test verification
        test_password = settings.SUPERADMIN_PASSWORD
        print(f"\n  Testing password: {test_password}")
        is_valid = verify_password(test_password, stored_hash)
        print(f"  Password valid: {is_valid}")
        
        if not is_valid:
            print("\n  ⚠️ Password doesn't match! Regenerating hash...")
            new_hash = get_password_hash(test_password)
            cursor.execute("UPDATE users SET hashed_password=? WHERE email=?", (new_hash, email))
            conn.commit()
            print("  ✅ Password hash updated!")
            
            # Verify again
            is_valid_now = verify_password(test_password, new_hash)
            print(f"  Password valid now: {is_valid_now}")
    else:
        print(f"  User {settings.SUPERADMIN_EMAIL} not found!")
        print("  Run: python create_admin_user.py")
        
except Exception as e:
    print(f"  Error: {e}")
    import traceback
    traceback.print_exc()

conn.close()

print("\n--- Done ---")
print("If everything looks good, try logging in with:")
print("  Email: jallusandeep@rubikview.com")
print("  Password: 8686504620SAn@#1")


