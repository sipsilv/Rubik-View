import os
import sys
import duckdb
import pandas as pd

# Setup path for config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))
from config import SIGNALS_DB

# === Parameters ===
manual_weight = 0.5
ai_weight = 0.5

# === Load AI scores ===
con = duckdb.connect(SIGNALS_DB)
df = con.execute("SELECT * FROM ai_scores").df()

# === Define which signal columns and weights to use ===
# Assuming signal columns start with 'Signal_'
signal_cols = [col for col in df.columns if col.startswith("Signal_")]

# Manual weights (you can also load from Excel if needed)
manual_weights = {
    col: 1.0 for col in signal_cols  # equal weight for now, replace if dynamic
}

# === Step 1: Compute manual score ===
df["Manual_Score"] = sum(df[col] * manual_weights[col] for col in signal_cols)

# === Step 2: Combine manual and AI scores ===
df["Final_Score"] = manual_weight * df["Manual_Score"] + ai_weight * df["AI_Score"]

# === Step 3: Rank and save ===
df.sort_values("Final_Score", ascending=False, inplace=True)

# Save to DuckDB
con.execute("DROP TABLE IF EXISTS final_scores")
con.execute("CREATE TABLE final_scores AS SELECT * FROM df")

print("✅ Final scores saved to: signals.duckdb → table: final_scores")
output_path = os.path.join(os.path.dirname(__file__), "TopPicks.xlsx")
df.head(20).to_excel(output_path, index=False)
print(f"📤 Top 20 picks exported to: {output_path}")
