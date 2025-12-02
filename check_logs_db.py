import sqlite3
import os

# Path to logs database
logs_db_path = r"Data\logs.db"

if not os.path.exists(logs_db_path):
    print(f"❌ Logs database not found at: {logs_db_path}")
    exit(1)

print(f"✓ Found logs database: {logs_db_path}\n")

conn = sqlite3.connect(logs_db_path)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("=" * 70)
print("TABLES IN LOGS DATABASE")
print("=" * 70)
for table in tables:
    print(f"  • {table[0]}")

print("\n" + "=" * 70)

# For each table, show structure and sample data
for table in tables:
    table_name = table[0]
    print(f"\nTABLE: {table_name}")
    print("-" * 70)
    
    # Get table schema
    cursor.execute(f"PRAGMA table_info({table_name});")
    columns = cursor.fetchall()
    print("\nColumns:")
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
    
    # Get row count
    cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
    count = cursor.fetchone()[0]
    print(f"\nTotal rows: {count}")
    
    # Show last 5 rows
    if count > 0:
        cursor.execute(f"SELECT * FROM {table_name} ORDER BY rowid DESC LIMIT 5;")
        rows = cursor.fetchall()
        print(f"\nLast {min(5, count)} rows:")
        for i, row in enumerate(rows, 1):
            print(f"\n  Row {i}:")
            for j, col in enumerate(columns):
                col_name = col[1]
                value = row[j]
                # Truncate long values
                if isinstance(value, str) and len(value) > 100:
                    value = value[:100] + "..."
                print(f"    {col_name}: {value}")
    
    print("\n" + "=" * 70)

conn.close()
