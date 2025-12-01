import duckdb
import pandas as pd
from pathlib import Path

# 1) Point to your Index.duckdb
db_path = Path(r"C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\Data\OHCLV Data\Index.duckdb")

# 2) Connect and query ^NSEI
conn = duckdb.connect(str(db_path))
df_nifty = conn.execute("""
    SELECT 
      date,
      open,
      high,
      low,
      close,
      adj_close,
      volume
    FROM index_ohlcv
    WHERE symbol = '^NSEI'
    ORDER BY date
""").df()
conn.close()

# 3) Inspect or save
print(df_nifty.tail(10))  # last 10 rows
# Or save to CSV:
# df_nifty.to_csv("nifty50_history.csv", index=False)
