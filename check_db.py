import sqlite3

conn = sqlite3.connect('rubikview_users.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('Tables:', tables)

# Get user columns
cursor.execute('PRAGMA table_info(users)')
columns = cursor.fetchall()
print('\nUser columns:')
for col in columns:
    print(f'  {col}')

# Get all users
cursor.execute('SELECT id, email, role, is_active FROM users')
users = cursor.fetchall()
print(f'\nTotal users: {len(users)}')
for user in users:
    print(f'  ID: {user[0]}, Email: {user[1]}, Role: {user[2]}, Active: {user[3]}')

conn.close()
