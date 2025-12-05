from fastapi import HTTPException
from typing import List

from core.database import get_duckdb_connection


def get_all_symbols() -> List[str]:
    """
    Return distinct stock symbols from DuckDB.
    """
    conn = get_duckdb_connection()

    try:
        tables = conn.execute("SHOW TABLES").fetchdf()

        # Ensure table exists
        if "yahoo_ohlcv" not in tables["name"].values:
            return []

        symbols = conn.execute(
            "SELECT DISTINCT symbol FROM yahoo_ohlcv ORDER BY symbol"
        ).fetchall()

        return [row[0] for row in symbols]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    finally:
        conn.close()


def get_symbol_history(symbol: str, limit: int = 100):
    """
    Return OHLCV history for a given stock symbol.
    """
    conn = get_duckdb_connection()

    try:
        query = """
            SELECT date, open, high, low, close, volume
            FROM yahoo_ohlcv
            WHERE symbol = ?
            ORDER BY date DESC
            LIMIT ?
        """

        df = conn.execute(query, (symbol, limit)).fetchdf()

        if df.empty:
            raise HTTPException(status_code=404, detail="Stock not found")

        df["date"] = df["date"].astype(str)
        return df.to_dict(orient="records")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    finally:
        conn.close()
