import os
import sys

# === Step 1: Add Rubik_view to sys.path ===
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../../"))
sys.path.append(project_root)

# === Step 2: Imports ===
import duckdb
import pandas as pd
import joblib
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

from config import TRAINING_DB

# === Step 3: Load training data ===
con = duckdb.connect(TRAINING_DB, read_only=True)
df = con.execute("SELECT * FROM training_data").df()

# === Step 4: Validate training data ===
if df.empty:
    raise ValueError("❌ Training data is empty. Please run generate_labels.py first.")

print(f"✅ Loaded {len(df)} rows from training_data.")

# === Step 5: Define features and target ===
exclude_cols = ['symbol', 'date', 'close', 'Future_Close', 'Return_5d', 'Target']
feature_cols = [col for col in df.columns if col not in exclude_cols]

if not feature_cols:
    raise ValueError("❌ No valid feature columns found. Check your signals.")

X = df[feature_cols]
y = df['Target']

if len(X) < 10:
    raise ValueError(f"❌ Not enough data to train a model (only {len(X)} rows).")

# === Step 6: Split data ===
X_train, X_test, y_train, y_test = train_test_split(X, y, shuffle=False, test_size=0.2)

# === Step 7: Train model ===
model = XGBClassifier(use_label_encoder=False, eval_metric='logloss')
model.fit(X_train, y_train)

# === Step 8: Evaluate ===
y_pred = model.predict(X_test)
print("✅ Accuracy:", accuracy_score(y_test, y_pred))
print("✅ Classification Report:\n", classification_report(y_test, y_pred))

# === Step 9: Save model ===
model_dir = os.path.join(current_dir, "models")
os.makedirs(model_dir, exist_ok=True)
model_path = os.path.join(model_dir, "ml_model_xgb.pkl")
joblib.dump(model, model_path)

print(f"✅ XGBoost model saved to: {model_path}")
