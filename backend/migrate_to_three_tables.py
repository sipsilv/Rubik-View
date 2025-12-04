"""
Migration script to restructure database into three tables:
1. logincredentials - userid and password
2. userdetails - full user details
3. userrequests - user registration requests

Run this once to migrate from old structure to new structure
"""
import sqlite3
from pathlib import Path
from core import database, models, user_utils, config, security
from datetime import datetime

def migrate_to_three_tables():
    """Migrate database to three-table structure"""
    db_path = Path(config.settings.BASE_DIR) / "Data" / "rubikview_users.db"
    
    print("=== Database Restructuring Migration ===\n")
    
    # Step 1: Create new tables
    print("Step 1: Creating new tables...")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Create logincredentials table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS logincredentials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userid VARCHAR UNIQUE NOT NULL,
                hashed_password VARCHAR NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                role VARCHAR DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ logincredentials table created")
        
        # Create userdetails table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS userdetails (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userid VARCHAR UNIQUE NOT NULL,
                email VARCHAR UNIQUE NOT NULL,
                full_name VARCHAR,
                phone_number VARCHAR,
                age INTEGER,
                address_line1 VARCHAR,
                address_line2 VARCHAR,
                city VARCHAR,
                state VARCHAR,
                postal_code VARCHAR,
                country VARCHAR,
                last_activity TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userid) REFERENCES logincredentials(userid) ON DELETE CASCADE
            )
        """)
        print("  ✅ userdetails table created")
        
        # Create userrequests table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS userrequests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userid VARCHAR UNIQUE NOT NULL,
                full_name VARCHAR NOT NULL,
                email VARCHAR NOT NULL,
                phone_number VARCHAR NOT NULL,
                age INTEGER NOT NULL,
                address_line1 VARCHAR,
                address_line2 VARCHAR,
                city VARCHAR,
                state VARCHAR,
                postal_code VARCHAR,
                country VARCHAR,
                message VARCHAR,
                status VARCHAR DEFAULT 'pending',
                resolved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ userrequests table created")
        
        conn.commit()
    except Exception as e:
        print(f"  ❌ Error creating tables: {e}")
        conn.rollback()
        conn.close()
        return
    finally:
        conn.close()
    
    # Step 2: Migrate existing users to new structure
    print("\nStep 2: Migrating existing users...")
    db = database.SessionLocal()
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Get all users from old table using raw SQL
        cursor.execute("SELECT id, userid, email, hashed_password, is_active, full_name, role, phone_number, age, address_line1, address_line2, city, state, postal_code, country, last_activity, created_at FROM users")
        old_users = cursor.fetchall()
        
        if not old_users:
            print("  ℹ️  No existing users to migrate")
        else:
            migrated_count = 0
            for user_row in old_users:
                try:
                    # Extract user data (index-based since we know the order)
                    user_id, userid, email, hashed_password, is_active, full_name, role, phone_number, age, address_line1, address_line2, city, state, postal_code, country, last_activity, created_at = user_row
                    
                    # Generate userid if missing
                    if not userid:
                        userid = user_utils.generate_unique_userid(db, full_name, phone_number)
                    
                    # Check if already migrated
                    cursor.execute("SELECT userid FROM logincredentials WHERE userid = ?", (userid,))
                    if cursor.fetchone():
                        continue
                    
                    # Insert into logincredentials
                    cursor.execute("""
                        INSERT INTO logincredentials (userid, hashed_password, is_active, role, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (userid, hashed_password, 1 if is_active else 0, role or 'user', created_at or datetime.utcnow(), datetime.utcnow()))
                    
                    # Insert into userdetails
                    cursor.execute("""
                        INSERT INTO userdetails (userid, email, full_name, phone_number, age, address_line1, address_line2, 
                                                 city, state, postal_code, country, last_activity, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (userid, email, full_name, phone_number, age, address_line1, address_line2, 
                          city, state, postal_code, country, last_activity, created_at or datetime.utcnow(), datetime.utcnow()))
                    
                    migrated_count += 1
                    print(f"    - Migrated user: {email} (userid: {userid})")
                    
                except Exception as e:
                    print(f"    ⚠️  Error migrating user {user_row[0]}: {e}")
                    continue
            
            conn.commit()
            print(f"  ✅ Migrated {migrated_count} users")
    
    except Exception as e:
        print(f"  ❌ Error migrating users: {e}")
        conn.rollback()
    finally:
        conn.close()
        db.close()
    
    # Step 3: Migrate pending_user_requests to userrequests
    print("\nStep 3: Migrating pending requests...")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Check if pending_user_requests table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_user_requests'")
        if cursor.fetchone():
            # Get all pending requests (select specific columns in known order)
            cursor.execute("""
                SELECT userid, full_name, email, phone_number, age, address_line1, address_line2,
                       city, state, postal_code, country, message, status, resolved_at, created_at
                FROM pending_user_requests
            """)
            pending_requests = cursor.fetchall()
            
            migrated_count = 0
            for req_row in pending_requests:
                try:
                    userid, full_name, email, phone_number, age, address_line1, address_line2, city, state, postal_code, country, message, status, resolved_at, created_at = req_row
                    
                    # Check if already migrated
                    cursor.execute("SELECT userid FROM userrequests WHERE userid = ?", (userid,))
                    if cursor.fetchone():
                        continue
                    
                    # Insert into userrequests
                    cursor.execute("""
                        INSERT INTO userrequests (userid, full_name, email, phone_number, age, address_line1, address_line2,
                                                 city, state, postal_code, country, message, status, resolved_at, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (userid, full_name, email, phone_number, age, address_line1, address_line2,
                          city, state, postal_code, country, message, status or 'pending', resolved_at, created_at or datetime.utcnow(), datetime.utcnow()))
                    
                    migrated_count += 1
                    
                except Exception as e:
                    print(f"    ⚠️  Error migrating request: {e}")
                    continue
            
            conn.commit()
            print(f"  ✅ Migrated {migrated_count} pending requests")
        else:
            print("  ℹ️  No pending_user_requests table found")
    
    except Exception as e:
        print(f"  ❌ Error migrating requests: {e}")
        conn.rollback()
    finally:
        conn.close()
    
    print("\n✅ Migration complete!")
    print("\nNote: Old tables (users, pending_user_requests) are kept for backward compatibility.")
    print("You can remove them after verifying the new structure works correctly.")

if __name__ == "__main__":
    migrate_to_three_tables()

