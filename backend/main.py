import os
import sqlite3
from urllib.parse import urlparse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core import database, models, security
# scheduler as scheduler_module  # Temporarily disabled
from core.config import settings
from api import auth, stocks, analysis, admin


def _get_sqlite_path() -> str | None:
    """Extract the SQLite file path from DATABASE_URL if present."""
    prefix = "sqlite:///"
    url = settings.DATABASE_URL
    if url.startswith(prefix):
        return url[len(prefix):]
    # Fallback for other sqlite URL styles if any are introduced
    parsed = urlparse(url)
    if parsed.scheme == "sqlite" and parsed.path:
        return parsed.path.lstrip("/")
    return None


def upgrade_user_schema_if_needed() -> None:
    """
    Ensure the existing users table has all expected columns.

    This is a lightweight, one-time migration helper that adds any missing
    nullable columns (phone_number, address fields, etc.) so that newer
    SQLAlchemy models can query without failing.
    """
    db_path = _get_sqlite_path()
    if not db_path or not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info('users')")
        rows = cur.fetchall()
        if not rows:
            # users table does not exist yet; models.create_all() will handle it
            return
        existing_cols = {row[1] for row in rows}

        def add_col(name: str, col_type: str) -> None:
            if name not in existing_cols:
                cur.execute(f"ALTER TABLE users ADD COLUMN {name} {col_type}")

        add_col("phone_number", "VARCHAR")
        add_col("age", "INTEGER")
        add_col("address_line1", "VARCHAR")
        add_col("address_line2", "VARCHAR")
        add_col("city", "VARCHAR")
        add_col("state", "VARCHAR")
        add_col("postal_code", "VARCHAR")
        add_col("country", "VARCHAR")
        add_col("telegram_chat_id", "VARCHAR")
        add_col("created_at", "DATETIME")
        add_col("updated_at", "DATETIME")

        conn.commit()
    finally:
        conn.close()


def upgrade_indicator_schema_if_needed() -> None:
    """
    Ensure the existing indicator_configs table has all expected columns.
    """
    db_path = _get_sqlite_path()
    if not db_path or not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info('indicator_configs')")
        rows = cur.fetchall()
        if not rows:
            # indicator_configs table does not exist yet; models.create_all() will handle it
            return
        existing_cols = {row[1] for row in rows}

        def add_col(name: str, col_type: str) -> None:
            if name not in existing_cols:
                cur.execute(f"ALTER TABLE indicator_configs ADD COLUMN {name} {col_type}")

        add_col("description", "VARCHAR")

        conn.commit()
    finally:
        conn.close()

def ensure_superadmin() -> None:
    """Create the configured super admin user if it does not exist, and update password if needed."""
    db = database.SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == settings.SUPERADMIN_EMAIL).first()
        if not user:
            # Use the proper password hashing function
            hashed = security.get_password_hash(settings.SUPERADMIN_PASSWORD)

            user = models.User(
                email=settings.SUPERADMIN_EMAIL,
                hashed_password=hashed,
                full_name=settings.SUPERADMIN_FULL_NAME,
                role=settings.SUPERADMIN_ROLE,
                is_active=True,
            )
            db.add(user)
            db.commit()
        else:
            # Update password hash if it was created with old method
            # Test if current password verifies correctly
            if not security.verify_password(settings.SUPERADMIN_PASSWORD, user.hashed_password):
                # Password doesn't verify, rehash it
                user.hashed_password = security.get_password_hash(settings.SUPERADMIN_PASSWORD)
                db.commit()
    finally:
        db.close()



# 1) Ensure tables exist
models.Base.metadata.create_all(bind=database.engine)

# 2) Ensure old databases are brought up to date for key tables
upgrade_user_schema_if_needed()
upgrade_indicator_schema_if_needed()

# 3) Ensure superadmin row exists
ensure_superadmin()

# 4) Initialize job scheduler
# scheduler_module.init_scheduler()  # Temporarily disabled

app = FastAPI(
    title="Rubik View API",
    description="Professional Stock Trading Platform API",
    version="1.0.0",
)

# CORS Middleware to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(stocks.router, prefix="/api/v1/stocks", tags=["stocks"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])
app.include_router(admin.router, prefix="/api/v1", tags=["admin"])


@app.get("/")
async def root():
    return {"message": "Welcome to Rubik View API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
