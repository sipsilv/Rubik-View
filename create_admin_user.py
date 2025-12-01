import sqlite3
import os
from backend.core.security import get_password_hash
from backend.core.config import settings

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "rubikview_users.db")

def create_users():
    print(f"Connecting to DB at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Drop tables to ensure schema update (order matters due to foreign keys)
    cursor.execute("DROP TABLE IF EXISTS admin_jobs")
    cursor.execute("DROP TABLE IF EXISTS change_requests")
    cursor.execute("DROP TABLE IF EXISTS otp_tokens")
    cursor.execute("DROP TABLE IF EXISTS users")

    # Create users table with extended profile fields
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR UNIQUE,
        hashed_password VARCHAR,
        is_active BOOLEAN,
        full_name VARCHAR,
        role VARCHAR,
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
    CREATE TABLE IF NOT EXISTS otp_tokens (
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
    CREATE TABLE IF NOT EXISTS change_requests (
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
    CREATE TABLE IF NOT EXISTS admin_jobs (
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

    # Create Super Admin
    super_email = settings.SUPERADMIN_EMAIL
    cursor.execute("SELECT * FROM users WHERE email=?", (super_email,))
    if not cursor.fetchone():
        hashed = get_password_hash(settings.SUPERADMIN_PASSWORD)
        cursor.execute(
            """INSERT INTO users (
                email, hashed_password, full_name, is_active, role,
                phone_number, age, address_line1, address_line2,
                city, state, postal_code, country, telegram_chat_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                super_email,
                hashed,
                settings.SUPERADMIN_FULL_NAME,
                True,
                settings.SUPERADMIN_ROLE,
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                settings.TELEGRAM_DEFAULT_CHAT_ID,
            ),
        )
        print("Super admin user created")
    else:
        print("Super admin user already exists")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    create_users()
