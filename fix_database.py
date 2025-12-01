"""
Quick fix script to recreate database with all tables and superadmin user.
Run: python fix_database.py
"""
import sqlite3
import os

# Import after setting up path
from backend.core.security import get_password_hash
from backend.core.config import settings

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rubikview_users.db")

print(f"Database path: {DB_PATH}")

# Remove old database
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
    print("Removed old database")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Create all tables
print("Creating tables...")

cursor.execute("""
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR UNIQUE,
    hashed_password VARCHAR,
    is_active BOOLEAN DEFAULT 1,
    full_name VARCHAR,
    role VARCHAR DEFAULT 'user',
    phone_number VARCHAR,
    age INTEGER,
    address_line1 VARCHAR,
    address_line2 VARCHAR,
    city VARCHAR,
    state VARCHAR,
    postal_code VARCHAR,
    country VARCHAR,
    telegram_chat_id VARCHAR,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
""")

cursor.execute("""
CREATE TABLE otp_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    purpose VARCHAR NOT NULL,
    code_hash VARCHAR NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
""")

cursor.execute("""
CREATE TABLE change_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    request_type VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'completed',
    details VARCHAR,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
""")

cursor.execute("""
CREATE TABLE admin_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending',
    triggered_by VARCHAR DEFAULT 'manual',
    log_path VARCHAR,
    details VARCHAR,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME
);
""")

print("Tables created!")

# Create superadmin
print(f"Creating superadmin: {settings.SUPERADMIN_EMAIL}")
hashed = get_password_hash(settings.SUPERADMIN_PASSWORD)
print(f"Password hash generated (length: {len(hashed)})")

cursor.execute("""
INSERT INTO users (email, hashed_password, full_name, is_active, role)
VALUES (?, ?, ?, 1, ?)
""", (
    settings.SUPERADMIN_EMAIL,
    hashed,
    settings.SUPERADMIN_FULL_NAME,
    settings.SUPERADMIN_ROLE,
))

conn.commit()

# Verify
cursor.execute("SELECT id, email, role FROM users")
users = cursor.fetchall()
print(f"\nUsers in database:")
for u in users:
    print(f"  ID: {u[0]}, Email: {u[1]}, Role: {u[2]}")

# Test password
from backend.core.security import verify_password
cursor.execute("SELECT hashed_password FROM users WHERE email=?", (settings.SUPERADMIN_EMAIL,))
stored_hash = cursor.fetchone()[0]
is_valid = verify_password(settings.SUPERADMIN_PASSWORD, stored_hash)
print(f"\nPassword verification test: {'PASSED' if is_valid else 'FAILED'}")

conn.close()

print("\n✅ Database fixed! Now restart the backend and try logging in.")
print(f"   Email: {settings.SUPERADMIN_EMAIL}")
print(f"   Password: {settings.SUPERADMIN_PASSWORD}")


