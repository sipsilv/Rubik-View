import sqlite3

try:
    conn = sqlite3.connect(r"Data\logs.db")
    cursor = conn.cursor()
    
    # Get tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    print("Tables in logs.db:")
    for t in tables:
        print(f"  - {t[0]}")
    
    # Check each table
    for t in tables:
        table_name = t[0]
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"\n{table_name}: {count} rows")
        
        if count > 0:
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
            rows = cursor.fetchall()
            for row in rows:
                print(f"  {row}")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
