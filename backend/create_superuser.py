"""
Script to create a superuser account for Rubik View
"""
from sqlalchemy.orm import Session
from core import database, models, security

def create_superuser(email: str, password: str, full_name: str = "Admin"):
    """Create a superuser account"""
    # Create database tables if they don't exist
    models.Base.metadata.create_all(bind=database.engine)
    
    # Create a database session
    db = database.SessionLocal()
    
    try:
        # Check if user already exists
        existing_user = db.query(models.User).filter(models.User.email == email).first()
        if existing_user:
            print(f"❌ User with email '{email}' already exists!")
            return False
        
        # Hash the password
        hashed_password = security.get_password_hash(password)
        
        # Create new user
        new_user = models.User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"✅ Superuser created successfully!")
        print(f"   Email: {email}")
        print(f"   Name: {full_name}")
        print(f"   You can now login with these credentials.")
        return True
        
    except Exception as e:
        print(f"❌ Error creating superuser: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("=== Rubik View Superuser Creation ===\n")
    
    # Default superuser credentials
    email = input("Enter email (default: admin@rubikview.com): ").strip() or "admin@rubikview.com"
    password = input("Enter password (default: admin123): ").strip() or "admin123"
    full_name = input("Enter full name (default: Admin): ").strip() or "Admin"
    
    create_superuser(email, password, full_name)
