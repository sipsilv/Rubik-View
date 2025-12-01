import os
import sys
import duckdb
import pandas as pd
import joblib

# Add Rubik_view root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))
from config import SIGNALS_DB

# === Load latest signal data ===
con = duckdb.connect(SIGNALS_DB)
try:
    df = con.execute("SELECT * FROM latest_signals").df()
except Exception as e:
    raise RuntimeError(f"Failed to load latest_signals table: {e}")

# === Prepare features ===
exclude_cols = ['symbol', 'date']
feature_cols = [col for col in df.columns if col not in exclude_cols]
X = df[feature_cols]

# === Load trained model ===
model_path = os.path.join(os.path.dirname(__file__), "models", "ml_model_xgb.pkl")
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Model file not found at: {model_path}")

model = joblib.load(model_path)

# === Predict AI Score (probability of class 1) ===
df['AI_Score'] = model.predict_proba(X)[:, 1]

# === Save AI scores to DuckDB ===
try:
    con.execute("DROP TABLE IF EXISTS ai_scores")
    con.execute("CREATE TABLE ai_scores AS SELECT * FROM df")
    print(f"✅ AI scores written to: {SIGNALS_DB} (table: ai_scores)")
except Exception as e:
    raise RuntimeError(f"Failed to save AI scores: {e}")
