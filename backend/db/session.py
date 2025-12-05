# db/session.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config.config import settings

# ------------------------------------
# 1) Declarative Base for all models
# ------------------------------------
Base = declarative_base()

# ------------------------------------
# 2) SQLAlchemy Engine
# ------------------------------------
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True
)

# ------------------------------------
# 3) Session Factory
# ------------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# ------------------------------------
# 4) Dependency for FastAPI Routes
# ------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
