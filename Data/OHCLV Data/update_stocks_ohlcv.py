import os
import duckdb
import pandas as pd
import yfinance as yf
from datetime import datetime, date, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# When running from the backend job runner, Excel is optional
USE_EXCEL = os.getenv("RUBIKVIEW_DISABLE_EXCEL") != "1"
if USE_EXCEL:
    import xlwings as xw  # type: ignore
else:
    xw = None  # type: ignore

# Lightweight "fast mode" for backend runs – limits history and symbol universe
FAST_MODE = os.getenv("RUBIKVIEW_FAST_MODE") == "1"

# ===== CONFIG =====

# Step 1: Find Rubik_view (project root) automatically by traversing up
def find_project_root(marker="rubikview.xlsm"):
    curr = Path(__file__).resolve()
    for parent in [curr.parent] + list(curr.parents):
        if (parent / marker).exists():
            return parent
    raise FileNotFoundError(f"Could not find {marker} in any parent directory of {curr}")

PROJECT_ROOT = find_project_root()  # This will always point to your Rubik_view folder!

# Now define all your paths relative to this
DB_PATH = PROJECT_ROOT / "Data" / "OHCLV Data" / "stocks.duckdb"
YEARS_BACK = 6
if FAST_MODE:
    # Use a shorter history window when running from the backend to reduce API
    # calls for the first full run. Subsequent runs still only fetch missing days.
    YEARS_BACK = 3
START_DATE = date.today() - timedelta(days=YEARS_BACK * 365)
YESTERDAY = date.today() - timedelta(days=1)
MAX_WORKERS = 20
if FAST_MODE:
    # Slightly fewer concurrent workers to avoid API throttling and improve
    # overall throughput in shared environments.
    MAX_WORKERS = 12

EXCEL_PATH = PROJECT_ROOT / "rubikview.xlsm"
EXCEL_SHEET = "Update Dash board"
EXCEL_RANGE = "H11"


# ===== HELPERS =====
def normalize(col: str) -> str:
    return col.strip().lower().replace(" ", "_").replace("-", "_")

def get_table_columns(conn):
    rows = conn.execute("PRAGMA table_info('yahoo_ohlcv')").fetchall()
    return [r[1] for r in rows]

def init_db():
    conn = duckdb.connect(str(DB_PATH))
    conn.execute("""
      CREATE TABLE IF NOT EXISTS yahoo_ohlcv (
        symbol VARCHAR,
        date   DATE
      );
    """)
    conn.close()

def load_symbols():
    SYMBOLS_DB = Path(r"C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\Data\Symbols Data\symbols.duckdb")
    conn = duckdb.connect(str(SYMBOLS_DB))
    # Fetch cleaned symbols for NSE and BSE from the cleaned master table
    nse = conn.execute("SELECT DISTINCT SYMBOL FROM NSE_Master_Cleaned WHERE SYMBOL IS NOT NULL").fetchdf()
    nse_syms = (nse['SYMBOL'].astype(str).str.strip() + ".NS").drop_duplicates()
    bse = conn.execute("SELECT DISTINCT SYMBOL_NAME FROM BSE_Master_Cleaned WHERE SYMBOL_NAME IS NOT NULL").fetchdf()
    bse_syms = (bse['SYMBOL_NAME'].astype(str).str.strip() + ".BO").drop_duplicates()
    all_syms = pd.concat([nse_syms, bse_syms]).dropna().unique().tolist()
    # In fast mode, only process a smaller, deterministic subset for quicker runs.
    if FAST_MODE:
        all_syms = all_syms[:500]
    conn.close()
    return all_syms

def insert_dynamic(conn, df: pd.DataFrame):
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.rename(columns=normalize)
    df['date'] = pd.to_datetime(df['date'])
    df['symbol'] = df['symbol']
    existing = get_table_columns(conn)
    # Ensure all columns in df are present in table, add if not
    for col in df.columns:
        if col not in existing:
            if col in ('symbol', 'date'):
                continue
            conn.execute(f'ALTER TABLE yahoo_ohlcv ADD COLUMN {col} DOUBLE;')
            existing.append(col)
    for col in existing:
        if col not in df.columns:
            df[col] = None
    to_ins = df[existing]
    conn.register("new_data", to_ins)
    conn.execute(f"INSERT INTO yahoo_ohlcv SELECT * FROM new_data;")
    conn.unregister("new_data")

def fetch_and_insert(symbol):
    # Always fetch from START_DATE (6 years ago) to YESTERDAY
    fetch_start = START_DATE
    fetch_end = YESTERDAY + timedelta(days=1)
    conn_r = duckdb.connect(str(DB_PATH))
    # Find latest date present in DB for symbol, if any
    last = conn_r.execute("SELECT MAX(date) FROM yahoo_ohlcv WHERE symbol=?", (symbol,)).fetchone()[0]
    conn_r.close()
    # Only fetch missing dates (after latest date)
    if last:
        last_dt = pd.to_datetime(last).date()
        if last_dt >= YESTERDAY:
            return symbol, 0, None, None, "uptodate"
        fetch_start = max(fetch_start, last_dt + timedelta(days=1))
    if fetch_start > YESTERDAY:
        return symbol, 0, None, None, "uptodate"
    df = yf.Ticker(symbol).history(
        start=fetch_start,
        end=fetch_end,
        auto_adjust=False,
        actions=True
    )
    if df.empty:
        return symbol, 0, None, None, "skipped"
    df = df.reset_index()
    df['symbol'] = symbol
    conn_w = duckdb.connect(str(DB_PATH))
    # For each row, if already present for (symbol, date), check if values match
    for _, row in df.iterrows():
        row_date = pd.to_datetime(row['Date']).date()
        db_row = conn_w.execute(
            "SELECT * FROM yahoo_ohlcv WHERE symbol=? AND date=?",
            (symbol, row_date)
        ).fetchdf()
        # Normalize columns for comparison
        values_are_different = True
        if not db_row.empty:
            db_row_sorted = db_row[df.columns.intersection(db_row.columns)]
            df_row_sorted = pd.DataFrame([row])[db_row.columns.intersection(df.columns)]
            values_are_different = not db_row_sorted.equals(df_row_sorted)
        if values_are_different:
            # Remove any old for that date and insert new
            conn_w.execute("DELETE FROM yahoo_ohlcv WHERE symbol=? AND date=?", (symbol, row_date))
            insert_dynamic(conn_w, pd.DataFrame([row]))
    conn_w.close()
    first_dt = df['Date'].min().date()
    last_dt  = df['Date'].max().date()
    return symbol, len(df), first_dt, last_dt, "success"

def get_ohlcv_table_name(db_path):
    with duckdb.connect(str(db_path), read_only=True) as con:
        tables = con.execute("SHOW TABLES").fetchdf()
        for t in tables.iloc[:, 0]:  # Table names column
            cols = con.execute(f"PRAGMA table_info('{t}')").fetchdf()['name'].str.lower().tolist()
            if 'symbol' in cols and 'date' in cols:
                return t
    return "N/A"

def write_progress_to_excel(done, total, progress_count, success, failed, skipped, uptodate, processed, updatedate):
    # When launched from the backend job runner, Excel updates are disabled
    if not USE_EXCEL or xw is None:
        return
    try:
        if not os.path.exists(EXCEL_PATH):
            print(f"Excel output error: File {EXCEL_PATH} not found.")
            return
        app = xw.apps.active if xw.apps else xw.App(visible=True)
        try:
            wb = xw.Book.caller()
        except Exception:
            wb = xw.Book(EXCEL_PATH)
        sht = wb.sheets[EXCEL_SHEET]
        headers = [
            "Table", "Progress %", "Progress Count", "Success", "Failed", "Skipped",
            "Up to Date", "Processed", "Update Date"
        ]
        progress_num = success + failed + skipped + uptodate
        ohlcv_table = get_ohlcv_table_name(DB_PATH)
        row = [
            f"{ohlcv_table} ({DB_PATH.name})",
            f"{(progress_num / total * 100):.2f}%" if total else "N/A",
            f"{done}/{total}",
            success,
            failed,
            skipped,
            uptodate,
            processed,
            updatedate
        ]
        sht.range("H11").value = headers
        sht.range("H12").value = row
    except Exception as e:
        print(f"Excel output error: {e}")

# ===== MAIN =====
def main():
    init_db()
    symbols = load_symbols()
    total = len(symbols)
    today_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    success = failed = skipped = uptodate = 0
    processed = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as exe:
        futures = {exe.submit(fetch_and_insert, s): s for s in symbols}
        for idx, future in enumerate(as_completed(futures), start=1):
            sym = futures[future]
            percent = idx / total * 100
            try:
                _, count, first_dt, last_dt, status_flag = future.result()
                processed += 1
                if status_flag == "success":
                    success += 1
                    status = f"+{count} rows ({first_dt}->{last_dt})"
                elif status_flag == "skipped":
                    skipped += 1
                    status = "skipped"
                elif status_flag == "uptodate":
                    uptodate += 1
                    status = "up-to-date"
                else:
                    status = status_flag
            except Exception as e:
                failed += 1
                status = f"FAILED: {e}"
            print(f"{idx}/{total} ({percent:.1f}%): {sym} -> {status}")
            if idx % 10 == 0 or idx == total:
                write_progress_to_excel(
                    idx, total, f"{idx}/{total}", success, failed, skipped, uptodate, processed, today_str
                )
    write_progress_to_excel(
        total, total, f"{total}/{total}", success, failed, skipped, uptodate, processed, today_str
    )
    print("\n[OK] Ultra-fast parallel update complete.")

if __name__ == "__main__":
    main()
