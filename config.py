import os

# Base directory: where config.py is located (Rubik_view root)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Data directories
DATA_DIR = os.path.join(BASE_DIR, "Data")
OHLCV_DB = os.path.join(DATA_DIR, "OHCLV Data", "stocks.duckdb")
SIGNALS_DB = os.path.join(DATA_DIR, "Signals Data", "signals.duckdb")
TRAINING_DB = os.path.join(DATA_DIR, "Training Data", "training_data.duckdb")
