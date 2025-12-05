from pathlib import Path
from fastapi import HTTPException
import duckdb
import pandas as pd

from config import config as settings
from core import constants


def classify_signal(score, min_score, max_score):
    if max_score == min_score:
        norm_val = 0
    else:
        norm_val = (score - min_score) / (max_score - min_score) * 20 - 10

    if norm_val >= 7:
        sig = "Extreme Bullish"
    elif norm_val >= 3:
        sig = "Bullish"
    elif norm_val > -3:
        sig = "Hold"
    elif norm_val > -7:
        sig = "Bearish"
    else:
        sig = "Extreme Bearish"

    return round(norm_val, 2), sig


def get_top_picks(limit: int = 10):
    try:
        ohlcv_path = Path(settings.DUCKDB_PATH)
        signals_db_path = ohlcv_path.parent.parent / "Signals Data" / "signals.duckdb"

        conn = duckdb.connect(str(signals_db_path), read_only=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not connect to signals DB: {str(e)}")

    try:
        tables = conn.execute("SHOW TABLES").fetchdf()
        if 'signals' not in tables['name'].values:
            return []

        cols_info = conn.execute("PRAGMA table_info('signals')").fetchdf()
        available_cols = cols_info['name'].tolist()

        select_cols = ['symbol', 'date']
        active_weights = {}

        for ind, weight in constants.DEFAULT_INDICATOR_WEIGHTS.items():
            col = ind.lower().replace(" ", "_").replace("%", "pct") + "_signal"
            if col in available_cols:
                select_cols.append(col)
                active_weights[col] = weight

        if len(select_cols) == 2:
            return []

        df = conn.execute(f"SELECT {', '.join(select_cols)} FROM signals").fetchdf()

        if df.empty:
            return []

        df = df.sort_values("date").groupby("symbol").tail(1).reset_index(drop=True)

        score_list = []
        for _, row in df.iterrows():
            total = 0
            for col, weight in active_weights.items():
                v = row.get(col)
                if pd.notna(v):
                    total += float(v) * float(weight)
            score_list.append({"symbol": row["symbol"], "raw_score": total})

        score_df = pd.DataFrame(score_list)

        if score_df.empty:
            return []

        min_score = score_df["raw_score"].min()
        max_score = score_df["raw_score"].max()

        results = []
        for _, row in score_df.iterrows():
            norm, signal = classify_signal(row["raw_score"], min_score, max_score)
            results.append({
                "symbol": row["symbol"],
                "score": norm,
                "signal": signal,
                "raw_score": row["raw_score"]
            })

        results.sort(key=lambda x: abs(x["score"]), reverse=True)
        return results[:limit]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()
