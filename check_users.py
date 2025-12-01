from backend.core.database import SessionLocal
from backend.core.models import User

db = SessionLocal()
users = db.query(User).all()
print(f'Total users: {len(users)}')
for u in users:
    print(f'Email: {u.email}, Role: {u.role}, Active: {u.is_active}')
db.close()
