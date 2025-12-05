import sqlite3
import os
from datetime import datetime
from config.config import settings

DB_PATH = os.path.join(settings.BASE_DIR, "Data", "logs.db")

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS job_logs (
            job_id INTEGER PRIMARY KEY,
            content TEXT,
            updated_at TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def append_log(job_id: int, text: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Check if exists
    cursor.execute("SELECT content FROM job_logs WHERE job_id = ?", (job_id,))
    row = cursor.fetchone()
    if row:
        new_content = row[0] + text
        cursor.execute("UPDATE job_logs SET content = ?, updated_at = ? WHERE job_id = ?", 
                       (new_content, datetime.utcnow(), job_id))
    else:
        cursor.execute("INSERT INTO job_logs (job_id, content, updated_at) VALUES (?, ?, ?)", 
                       (job_id, text, datetime.utcnow()))
    conn.commit()
    conn.close()

def get_log(job_id: int) -> str:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT content FROM job_logs WHERE job_id = ?", (job_id,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else ""
