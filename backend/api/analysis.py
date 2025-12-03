from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import duckdb
import pandas as pd
import numpy as np
from core import database, config, constants

router = APIRouter()

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

from pathlib import Path

@router.get("/top-picks")
def get_top_picks(limit: int = 10):
    """
    Get top stock picks based on calculated scores from signals.
    """
    # Path to signals DB
    # config.settings.DUCKDB_PATH is ".../Data/OHCLV Data/stocks.duckdb"
    # We need ".../Data/Signals Data/signals.duckdb"
    
    try:
        ohlcv_path = Path(config.settings.DUCKDB_PATH)
        # ohlcv_path.parent is "OHCLV Data", ohlcv_path.parent.parent is "Data"
        signals_db_path = ohlcv_path.parent.parent / "Signals Data" / "signals.duckdb"
        
        conn = duckdb.connect(str(signals_db_path), read_only=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not connect to signals DB: {str(e)}")

    try:
        # Check if signals table exists
        tables = conn.execute("SHOW TABLES").fetchdf()
        if 'signals' not in tables['name'].values:
            return []

        # Fetch latest signals for each symbol
        # We need to dynamically select columns that match our weights
        cols_info = conn.execute("PRAGMA table_info('signals')").fetchdf()
        available_cols = cols_info['name'].tolist()
        
        select_cols = ['symbol', 'date']
        active_weights = {}
        
        for indicator, weight in constants.DEFAULT_INDICATOR_WEIGHTS.items():
            col_name = indicator.lower().replace(" ", "_").replace("%", "pct") + "_signal"
            if col_name in available_cols:
                select_cols.append(col_name)
                active_weights[col_name] = weight
        
        if len(select_cols) <= 2:
            return [] # No signal columns found

        query = f"SELECT {', '.join(select_cols)} FROM signals"
        df = conn.execute(query).fetchdf()
        
        if df.empty:
            return []

        # Filter for latest date per symbol
        df = df.sort_values('date').groupby('symbol').tail(1).reset_index(drop=True)
        
        score_list = []
        for _, row in df.iterrows():
            symbol = row['symbol']
            total_score = 0
            for col, weight in active_weights.items():
                signal = row.get(col, None)
                if signal is not None and pd.notnull(signal):
                    try:
                        total_score += float(signal) * float(weight)
                    except:
                        pass
            score_list.append({'symbol': symbol, 'raw_score': total_score})
        
        score_df = pd.DataFrame(score_list)
        if score_df.empty:
            return []
            
        # Normalize
        score_min = score_df['raw_score'].min()
        score_max = score_df['raw_score'].max()
        
        results = []
        for _, row in score_df.iterrows():
            norm_score, signal_text = classify_signal(row['raw_score'], score_min, score_max)
            results.append({
                "symbol": row['symbol'],
                "score": norm_score,
                "signal": signal_text,
                "raw_score": row['raw_score']
            })
            
        # Sort by absolute score (strength of signal)
        results.sort(key=lambda x: abs(x['score']), reverse=True)
        
        return results[:limit]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
