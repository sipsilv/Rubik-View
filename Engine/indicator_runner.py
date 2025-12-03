import duckdb
import pandas as pd
import numpy as np
import os
import sqlite3
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from indicators import *
import threading
import datetime

# Excel integration is optional when running from backend jobs
USE_EXCEL = os.getenv("RUBIKVIEW_DISABLE_EXCEL") != "1"
if USE_EXCEL:
    import xlwings as xw  # type: ignore
else:
    xw = None  # type: ignore

# Fast mode for backend runs: limit symbols / indicators / threads so the job
# completes more quickly when triggered from the Admin console.
FAST_MODE = os.getenv("RUBIKVIEW_FAST_MODE") == "1"

# === Dynamic Path Setup ===
def find_project_root():
    """Find project root by looking for Data or backend folder"""
    curr = Path(__file__).resolve()
    for parent in [curr.parent] + list(curr.parents):
        if (parent / "Data").exists() and (parent / "backend").exists():
            return parent
    raise FileNotFoundError(f"Could not find project root (Data/backend folders) in any parent directory of {curr}")

ROOT = find_project_root()
EXCEL_FILE = ROOT / "rubikview.xlsm"  # Only used if Excel mode is enabled
INDICATOR_SHEET = "Indicators"
OHLCV_DB = ROOT / "Data" / "OHCLV Data" / "stocks.duckdb"
SIGNALS_DB = ROOT / "Data" / "Signals Data" / "signals.duckdb"
DASH_SHEET = "Update Dash board"
CONFIG_DB = ROOT / "rubikview_users.db"

progress_lock = threading.Lock()

def update_excel_summary(done, total, messages, dash_sheet):
    # Count message types
    success_count = sum(1 for m in messages if "processed" in m)
    fail_count = sum(1 for m in messages if "error" in m)
    skipped_count = sum(1 for m in messages if "skipped" in m)
    uptodate_count = sum(1 for m in messages if "up-to-date" in m)
    processed_symbols = success_count + fail_count + skipped_count + uptodate_count
    processed = success_count + skipped_count + uptodate_count

    progress_str = (f"{processed_symbols / total * 100:.2f}%" if total else "N/A")
    progress_count_str = f"{done}/{total}"

    with duckdb.connect(str(SIGNALS_DB), read_only=True) as con:
        table_list = con.execute("SHOW TABLES").fetchdf()['name'].tolist()
        table_name = ', '.join(table_list) if table_list else "N/A"

    headers = [
        "Table", "Progress %", "Progress Count", "Success", "Failed", "Skipped",
        "Up to Date", "Processed", "Update Date"
    ]
    row = [
        f"{table_name} ({SIGNALS_DB.name})",
        progress_str,
        progress_count_str,
        success_count,
        fail_count,
        skipped_count,
        uptodate_count,
        processed,
        datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    ]
    # Write headers and data together
    dash_sheet.range("H18").value = headers
    dash_sheet.range("H19").value = row

def update_excel_progress(done, total, messages):
    # When launched from the backend job runner, skip Excel updates
    if not USE_EXCEL or xw is None:
        return
    try:
        with progress_lock:
            book = xw.Book(str(EXCEL_FILE))
            sht = book.sheets[DASH_SHEET]
            # Only update the summary table (headers and row)
            update_excel_summary(done, total, messages, sht)
    except Exception as e:
        print(f"Excel update error: {e}")

def main():
    # Clear dashboard summary area at start (DO NOT clear K18 or summary table separately)
    if USE_EXCEL and xw is not None:
        try:
            book = xw.Book(str(EXCEL_FILE))
            sht = book.sheets[DASH_SHEET]
            sht.range("H18:P25").value = ""   # Clears summary table area
        except Exception:
            pass

    # Load indicator config: from DB when running headless, else from Excel for legacy flows.
    if USE_EXCEL and xw is not None:
        try:
            sht = xw.Book(str(EXCEL_FILE)).sheets[INDICATOR_SHEET]
            ind_df = sht.range("A1").options(pd.DataFrame, header=1, index=False, expand="table").value
        except Exception as e:
            print(f"[ERROR] Could not read Excel config: {e}")
            raise SystemExit
    else:
        # Read from SQLite indicator_configs
        if not CONFIG_DB.exists():
            print("[ERROR] No indicator config DB found. Please configure indicators in the UI.")
            raise SystemExit(1)
        conn = sqlite3.connect(CONFIG_DB)
        try:
            df = pd.read_sql_query(
                """
                SELECT
                    indicator_name AS Indicator_Name,
                    CASE WHEN active = 1 THEN 'Y' ELSE 'N' END AS Active,
                    parameter_1 AS Parameter_1,
                    parameter_2 AS Parameter_2,
                    parameter_3 AS Parameter_3,
                    manual_weight AS Manual_Weight,
                    CASE WHEN use_ai_weight = 1 THEN 'Y' ELSE 'N' END AS Use_AI_Weight,
                    ai_latest_weight AS AI_Latest_Weight
                FROM indicator_configs
                """,
                conn,
            )
        finally:
            conn.close()
        ind_df = df

    active_inds = ind_df[ind_df["Active"].str.upper() == "Y"].copy()
    if active_inds.empty:
        print("No active indicators! Exiting.")
        raise SystemExit(1)
    print(f"Active indicators: {len(active_inds)}")
    if FAST_MODE and len(active_inds) > 10:
        # In fast mode, only calculate a smaller core set of indicators to keep
        # per-symbol work light. The full set can still be run from Excel.
        active_inds = active_inds.head(10)
        print(f"FAST_MODE enabled -> limiting indicators to first {len(active_inds)} active rows")

    # Get symbols from OHLCV DB
    with duckdb.connect(str(OHLCV_DB), read_only=True) as con:
        symbols = con.execute("SELECT DISTINCT symbol FROM yahoo_ohlcv").fetchdf()['symbol'].tolist()
    print(f"Symbols: {len(symbols)}")
    if FAST_MODE and len(symbols) > 500:
        # For fast, UI-triggered runs, process only a subset of symbols so the
        # job returns quickly. Full universe can be handled offline.
        symbols = symbols[:500]
        print(f"FAST_MODE enabled -> limiting symbols to first {len(symbols)}")

    # Prep signals DB
    with duckdb.connect(str(SIGNALS_DB)) as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS signals (
                symbol VARCHAR,
                date DATE
            )
        """)

    # Indicator calculation map (unchanged)
    def calculate_indicator(name, df, p1, p2, p3):
        if name == "RSI":
            return calculate_rsi(df['Close'], int(p1))
        elif name == "MFI":
            return calculate_mfi(df['High'], df['Low'], df['Close'], df['Volume'], int(p1))
        elif name == "CCI":
            return calculate_cci(df['High'], df['Low'], df['Close'], int(p1))
        elif name == "StochRSI":
            return calculate_stochrsi(df['Close'], int(p1), int(p2), int(p3))
        elif name == "ROC":
            return calculate_roc(df['Close'], int(p1))
        elif name == "MACD":
            return calculate_macd(df['Close'], int(p1), int(p2), int(p3))
        elif name == "EMA Crossover":
            return calculate_ema_crossover(df['Close'], int(p1), int(p2))
        elif name == "SMA Crossover":
            return calculate_sma_crossover(df['Close'], int(p1), int(p2))
        elif name == "ATR":
            return calculate_atr(df['High'], df['Low'], df['Close'], int(p1))
        elif name == "Williams %R":
            return calculate_williams_r(df['High'], df['Low'], df['Close'], int(p1))
        elif name == "ADX":
            return calculate_adx(df['High'], df['Low'], df['Close'], int(p1))
        elif name == "VWAP":
            return calculate_vwap(df)
        elif name == "SuperTrend":
            return calculate_supertrend(df, int(p1), float(p2))
        elif name == "Parabolic SAR":
            return calculate_parabolic_sar(df['High'], df['Low'], float(p1), float(p2), float(p3))
        elif name == "Ichimoku":
            return calculate_ichimoku(df, int(p1), int(p2), int(p3))
        elif name == "Bollinger Bands":
            return calculate_bollinger(df['Close'], int(p1), float(p2))
        elif name == "Donchian Channel":
            return calculate_donchian(df['High'], df['Low'], int(p1))
        elif name == "Keltner Channel":
            return calculate_keltner(df, int(p1))
        elif name == "VMA":
            return calculate_vma(df['Volume'], int(p1)) 
        elif name == "OBV":
            return calculate_obv(df['Close'], df['Volume'])
        elif name == "ADL":
            return calculate_adl(df['High'], df['Low'], df['Close'], df['Volume'])
        else:
            return np.nan

    # Main per-symbol worker
    def process_symbol(sym):
        try:
            with duckdb.connect(str(OHLCV_DB), read_only=True) as con:
                df = con.execute(
                    "SELECT date, open, high, low, close, adj_close, volume FROM yahoo_ohlcv WHERE symbol=? ORDER BY date",
                    (sym,)
                ).fetchdf()
            if df.empty:
                return None, f"{sym} | skipped (no data)"
            last_date = df['date'].iloc[-1]
            with duckdb.connect(str(SIGNALS_DB)) as con:
                already = con.execute("SELECT COUNT(*) FROM signals WHERE symbol=? AND date=?", (sym, last_date)).fetchone()[0]
            if already:
                return None, f"{sym} | up-to-date"
            df = df.rename(columns={'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close', 'volume': 'Volume'})
            row = {'symbol': sym, 'date': last_date}
            for _, ind in active_inds.iterrows():
                name = ind['Indicator_Name']
                p1 = ind['Parameter_1'] if not pd.isnull(ind['Parameter_1']) else None
                p2 = ind['Parameter_2'] if not pd.isnull(ind['Parameter_2']) else None
                p3 = ind['Parameter_3'] if not pd.isnull(ind['Parameter_3']) else None
                mweight = float(ind['Manual_Weight']) if not pd.isnull(ind['Manual_Weight']) else 1.0
                use_ai  = str(ind['Use_AI_Weight']).upper() == "Y"
                aiweight = float(ind['AI_Latest_Weight']) if not pd.isnull(ind['AI_Latest_Weight']) else mweight
                weight = aiweight if use_ai else mweight
                try:
                    signal = calculate_indicator(name, df, p1, p2, p3)
                except Exception as ee:
                    signal = np.nan
                icol = name.lower().replace(" ", "_").replace("%", "pct")
                row[f"{icol}_signal"] = signal   # store as float, not int!
                row[f"{icol}_weight"] = weight
            return row, f"{sym} | processed"
        except Exception as e:
            return None, f"{sym} | error: {str(e)}"

    # FAST PARALLEL EXECUTION
    results = []
    messages = []
    N_THREADS = 20
    UPDATE_FREQ = 10  # update summary in Excel every 10 symbols
    if FAST_MODE:
        # Slightly lower parallelism to reduce contention / throttling, which
        # often improves effective throughput for mixed IO/CPU work.
        N_THREADS = 12
        UPDATE_FREQ = 25

    with ThreadPoolExecutor(max_workers=N_THREADS) as executor:
        futures = {executor.submit(process_symbol, sym): sym for sym in symbols}
        done = 0
        for fut in as_completed(futures):
            row, msg = fut.result()
            done += 1
            print(f"[{done}/{len(symbols)}] {msg}")
            if row is not None:
                results.append(row)
            messages.append(msg)
            if done % UPDATE_FREQ == 0 or done == len(symbols):
                update_excel_progress(done, len(symbols), messages)

    print("[OK] Done.")
    update_excel_progress(len(symbols), len(symbols), messages)   # Final update

    # FORCE EXCEL RECALC (optional, helps show correct numbers immediately)
    try:
        book = xw.Book(str(EXCEL_FILE))
        sht = book.sheets[DASH_SHEET]
        sht.api.Calculate()
    except Exception:
        pass

    # INSERT TO SIGNALS DB
    if results:
        df_signals = pd.DataFrame(results)
        with duckdb.connect(str(SIGNALS_DB)) as con:
            dbcols = [c[1] for c in con.execute("PRAGMA table_info('signals')").fetchall()]
            for c in df_signals.columns:
                if c not in dbcols:
                    if c.endswith("_weight"):
                        con.execute(f"ALTER TABLE signals ADD COLUMN {c} DOUBLE")
                    elif c.endswith("_signal"):
                        con.execute(f"ALTER TABLE signals ADD COLUMN {c} DOUBLE")
                    else:
                        con.execute(f"ALTER TABLE signals ADD COLUMN {c} VARCHAR")
            con.register("batch", df_signals)
            con.execute("INSERT INTO signals SELECT * FROM batch")
            con.unregister("batch")
        print("[OK] All signals saved to signals.duckdb.")
    else:
        print("[WARN] No new signals to insert.")

if __name__ == "__main__":
    main()
