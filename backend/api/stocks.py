from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import duckdb
import pandas as pd
from core import database, config

router = APIRouter()

@router.get("/", response_model=List[str])
def get_stocks():
    """
    Get a list of all available stock symbols.
    """
    conn = database.get_duckdb_connection()
    try:
        # Assuming the table name is 'yahoo_ohlcv' based on previous file exploration
        # We need to check if the table exists first
        tables = conn.execute("SHOW TABLES").fetchdf()
        if 'yahoo_ohlcv' not in tables['name'].values:
             # Fallback or check other tables if yahoo_ohlcv doesn't exist
             return []
        
        symbols = conn.execute("SELECT DISTINCT symbol FROM yahoo_ohlcv ORDER BY symbol").fetchall()
        return [s[0] for s in symbols]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/{symbol}/history")
def get_stock_history(symbol: str, limit: int = 100):
    """
    Get OHLCV history for a specific stock.
    """
    conn = database.get_duckdb_connection()
    try:
        query = f"""
            SELECT date, open, high, low, close, volume 
            FROM yahoo_ohlcv 
            WHERE symbol = ? 
            ORDER BY date DESC 
            LIMIT ?
        """
        df = conn.execute(query, (symbol, limit)).fetchdf()
        if df.empty:
            raise HTTPException(status_code=404, detail="Stock not found")
        
        # Convert to list of dicts for JSON response
        # Ensure date is string
        df['date'] = df['date'].astype(str)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
