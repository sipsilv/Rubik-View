from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import duckdb
from config.config import settings

# --- SQLite for User Data ---
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- DuckDB for Market Data ---
def get_duckdb_connection():
    # Connect in read-only mode to avoid locking issues if multiple processes access it
    # or use read_only=False if we need to write signals
    conn = duckdb.connect(settings.DUCKDB_PATH, read_only=True)
    return conn
