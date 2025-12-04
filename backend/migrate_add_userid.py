"""
Migration script to add userid to existing users
Run this once after updating the User model
"""
import sqlite3
from pathlib import Path
from core import database, models, user_utils, config

def migrate_userids():
    """Add userid column and populate it for all existing users"""
    db_path = Path(config.settings.BASE_DIR) / "Data" / "rubikview_users.db"
    
    # Step 1: Add columns to database if they don't exist
    print("Step 1: Adding columns to database...")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Check if userid column exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "userid" not in columns:
            print("  - Adding userid column...")
            cursor.execute("ALTER TABLE users ADD COLUMN userid VARCHAR")
            conn.commit()
            print("  ✅ userid column added")
        else:
            print("  ✅ userid column already exists")
        
        if "last_activity" not in columns:
            print("  - Adding last_activity column...")
            cursor.execute("ALTER TABLE users ADD COLUMN last_activity TIMESTAMP")
            conn.commit()
            print("  ✅ last_activity column added")
        else:
            print("  ✅ last_activity column already exists")
            
    except Exception as e:
        print(f"  ❌ Error adding columns: {e}")
        conn.rollback()
        conn.close()
        return
    finally:
        conn.close()
    
    # Step 2: Create pending_user_requests table if it doesn't exist
    print("\nStep 2: Creating pending_user_requests table...")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pending_user_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userid VARCHAR UNIQUE NOT NULL,
                full_name VARCHAR,
                email VARCHAR,
                phone_number VARCHAR,
                age INTEGER,
                address_line1 VARCHAR,
                address_line2 VARCHAR,
                city VARCHAR,
                state VARCHAR,
                postal_code VARCHAR,
                country VARCHAR,
                telegram_chat_id VARCHAR,
                message VARCHAR,
                status VARCHAR DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print("  ✅ pending_user_requests table ready")
    except Exception as e:
        print(f"  ❌ Error creating table: {e}")
        conn.rollback()
    finally:
        conn.close()
    
    # Step 3: Populate userid for existing users
    print("\nStep 3: Populating userid for existing users...")
    db = database.SessionLocal()
    try:
        # Get all users (using raw SQL to avoid model issues)
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("SELECT id, email FROM users WHERE userid IS NULL OR userid = ''")
        users_without_userid = cursor.fetchall()
        conn.close()
        
        print(f"  Found {len(users_without_userid)} users without userid")
        
        for user_id, email in users_without_userid:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user and not user.userid:
                userid = user_utils.generate_unique_userid(db)
                user.userid = userid
                db.add(user)
                print(f"    - User {email}: Assigned userid {userid}")
        
        db.commit()
        print(f"\n✅ Migration complete! {len(users_without_userid)} users updated.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("=== UserID Migration ===\n")
    migrate_userids()

