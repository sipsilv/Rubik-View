import os
import sys
import duckdb
import pandas as pd

# === Add your project root to Python path ===
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../../"))
sys.path.append(project_root)

from config import OHLCV_DB, SIGNALS_DB, TRAINING_DB

forward_days = 5
threshold = 0.02  # 2% future return threshold

# === Connect to DuckDB databases ===
ohlcv_con   = duckdb.connect(OHLCV_DB,   read_only=True)
signal_con  = duckdb.connect(SIGNALS_DB, read_only=True)
training_con = duckdb.connect(TRAINING_DB)

# === Load signals and prices ===
signal_df = signal_con.execute("SELECT * FROM signals").df()
price_df  = ohlcv_con.execute("SELECT symbol, date, close FROM yahoo_ohlcv").df()

# === Ensure 'date' columns are datetime ===
signal_df['date'] = pd.to_datetime(signal_df['date'])
price_df ['date'] = pd.to_datetime(price_df ['date'])

# === Merge on symbol + date ===
df = pd.merge(signal_df, price_df, on=["symbol", "date"], how="inner")
print(f"Merged rows: {len(df)}")

# === Sort and compute forward return ===
df = df.sort_values(['symbol','date'])
df['future_close'] = df.groupby('symbol')['close'].shift(-forward_days)
df['return_5d']   = (df['future_close'] - df['close']) / df['close']
df['target']      = (df['return_5d'] > threshold).astype(int)

# === Drop the last N rows per symbol where future_close is NaN ===
before = len(df)
df = df.dropna(subset=['return_5d','target'])
after  = len(df)
print(f"Rows before dropna: {before}, after dropna: {after}")
print(f"🏁 Final labeled rows ready for ML: {len(df)}")

# === Save to DuckDB ===
training_con.execute("DROP TABLE IF EXISTS training_data")
training_con.execute("CREATE TABLE training_data AS SELECT * FROM df")
print(f"✅ Labeled data saved to {TRAINING_DB} (table: training_data)")

# === Export to CSV for quick inspection ===
out_csv = os.path.join(os.path.dirname(TRAINING_DB), "labeled_data.csv")
df.to_csv(out_csv, index=False)
print(f"✅ Also exported labeled data to {out_csv}")
