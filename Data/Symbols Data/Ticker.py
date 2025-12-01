import os
import pandas as pd
import duckdb
import xlwings as xw
from datetime import datetime
from pathlib import Path

def find_project_root(marker="rubikview.xlsm"):
    curr = Path(__file__).resolve()
    for parent in [curr.parent] + list(curr.parents):
        if (parent / marker).exists():
            return parent
    raise FileNotFoundError(f"Could not find {marker} in any parent directory of {curr}")

def update_symbol_db(write_excel=True):
    # ==== DYNAMIC PATH SETUP ====
    RUBIK_ROOT = find_project_root()
    DATA = RUBIK_ROOT / "Data" / "Symbols Data"
    META = DATA / "All stocks Meta Data files"
    db_path = DATA / "symbols.duckdb"
    # ... rest of your function ...


    today_str = datetime.today().strftime("%Y-%m-%d")

    # === Load NSE (live download)
    nse_eq_url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
    df_nse = pd.read_csv(nse_eq_url, skipinitialspace=True)
    df_nse.columns = df_nse.columns.str.strip().str.upper().str.replace(" ", "_")
    df_nse['MISSING_DATA'] = df_nse.isnull().any(axis=1).map({True: 'Yes', False: 'No'})
    nse_loaded_count = len(df_nse)

    # === Load BSE Master & Meta from CSV
    bse_csv_path = META / "BSE Meta Data.csv"
    bhavcopy_path = META / "BSE Symbols.csv"
    df_bse = pd.read_csv(bse_csv_path, skipinitialspace=True)
    df_bse.columns = df_bse.columns.str.strip().str.upper().str.replace(" ", "_")
    df_bse['MISSING_DATA'] = df_bse.isnull().any(axis=1).map({True: 'Yes', False: 'No'})
    bse_loaded_count = len(df_bse)

    df_bse_meta = pd.read_csv(bhavcopy_path, skipinitialspace=True)
    df_bse_meta.columns = df_bse_meta.columns.str.strip().str.upper().str.replace(" ", "_")
    df_bse_meta['MISSING_DATA'] = df_bse_meta.isnull().any(axis=1).map({True: 'Yes', False: 'No'})
    bsemeta_loaded_count = len(df_bse_meta)

    # === Load All Nifty Indices Meta Data ===
    nifty_indices_path = META / "All Nifty Indices Meta Data.csv"
    df_nifty = pd.read_csv(nifty_indices_path)
    df_nifty.columns = [col.strip() for col in df_nifty.columns]
    nifty_count = len(df_nifty)

    # === Load All BSE Indices Meta Data ===
    bse_indices_path = META / "All BSE Indices Meta Data.csv"
    df_bse_indices = pd.read_csv(bse_indices_path)
    df_bse_indices.columns = [col.strip() for col in df_bse_indices.columns]
    bse_indices_count = len(df_bse_indices)

    # === Write to DuckDB ===
    with duckdb.connect(str(db_path)) as con:
        # NSE/BSE main tables
        con.execute("DROP TABLE IF EXISTS nse_symbols")
        con.execute("CREATE TABLE nse_symbols AS SELECT * FROM df_nse")
        con.execute("DROP TABLE IF EXISTS bse_symbols")
        con.execute("CREATE TABLE bse_symbols AS SELECT * FROM df_bse")
        con.execute("DROP TABLE IF EXISTS bse_metadata")
        con.execute("CREATE TABLE bse_metadata AS SELECT * FROM df_bse_meta")

        # Nifty/BSE indices
        con.execute("DROP TABLE IF EXISTS All_Nifty_Indices_Meta_Data")
        con.execute("CREATE TABLE All_Nifty_Indices_Meta_Data AS SELECT * FROM df_nifty")
        con.execute("DROP TABLE IF EXISTS All_BSE_Indices_Meta_Data")
        con.execute("CREATE TABLE All_BSE_Indices_Meta_Data AS SELECT * FROM df_bse_indices")

        # Print imported row counts in terminal (including virtuals here)
        all_tables = con.execute("SHOW TABLES").fetchdf()['name'].tolist()
        print("\nTables currently in DB:", all_tables)
        print("\nImported row counts:")
        for tbl in all_tables:
            try:
                count = con.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
                print(f"{tbl}: {count}")
            except Exception as e:
                print(f"{tbl}: Error getting row count ({e})")

        # --- Create NSE_Master view (FULL OUTER JOIN) ---
        con.execute("""
            CREATE OR REPLACE VIEW NSE_Master AS
            SELECT a.*, b.*
            FROM All_Nifty_Indices_Meta_Data a
            FULL OUTER JOIN nse_symbols b
            ON a."Symbol" = b."SYMBOL"
        """)
        print("\n✅ NSE_Master view created (join of All_Nifty_Indices_Meta_Data and nse_symbols).")

        # --- Create NSE_Master_Cleaned view (NO EXPORT) ---
        con.execute("""
            CREATE OR REPLACE VIEW NSE_Master_Cleaned AS
            SELECT
                COALESCE("Symbol", SYMBOL_1)                    AS SYMBOL,
                COALESCE("Company Name", NAME_OF_COMPANY)        AS COMPANY_NAME,
                Industry                                         AS INDUSTRY,
                IndexName                                        AS INDEX_NAME
            FROM NSE_Master
        """)
        print("✅ NSE_Master_Cleaned view created.")

        # --- Create BSE_Master view ---
        con.execute("""
            CREATE OR REPLACE VIEW BSE_Master AS
            SELECT idx.*, sym.*, meta.*
            FROM All_BSE_Indices_Meta_Data idx
            FULL OUTER JOIN bse_symbols sym
                ON CAST(idx."Scrip Code" AS VARCHAR) = CAST(sym.SECURITY_CODE AS VARCHAR)
            FULL OUTER JOIN bse_metadata meta
                ON CAST(idx."Scrip Code" AS VARCHAR) = CAST(meta.SC_CODE AS VARCHAR)
        """)
        print("✅ BSE_Master view created/joined.")

        # --- Create Cleaned BSE Master view for export ---
        con.execute("""
            CREATE OR REPLACE VIEW BSE_Master_Cleaned AS
            SELECT
                COALESCE("Scrip Code", SC_CODE, SECURITY_CODE) AS SYMBOL_CODE,
                COALESCE(COMPANY, ISSUER_NAME) AS COMPANY_NAME,
                COALESCE(SECURITY_ID, SC_NAME) AS SYMBOL_NAME,
                IndexName as INDEX_NAME,
                SECTOR_NAME,
                COALESCE(INDUSTRY_NEW_NAME, INDUSTRY_1) AS INDUSTRY,
                INSTRUMENT
            FROM BSE_Master
        """)
        print("✅ BSE_Master_Cleaned view created.")

        # --- Robust BSE Mapping using Cleaned BSE_Master view ---
        def get_bse_symbol_map():
            bse_map = {}
            # Use SYMBOL_CODE and COMPANY_NAME from BSE_Master_Cleaned
            map_df = con.execute("""
                SELECT SYMBOL_CODE, COMPANY_NAME FROM BSE_Master_Cleaned
                WHERE SYMBOL_CODE IS NOT NULL AND COMPANY_NAME IS NOT NULL
            """).fetchdf()
            for _, row in map_df.iterrows():
                code = str(row['SYMBOL_CODE']).strip().upper()
                name = str(row['COMPANY_NAME']).strip()
                bse_map[code] = name
            return bse_map

        # --- Prepare summary for Excel (skip virtuals) ---
        skip_virtuals = {'NSE_Master', 'NSE_Master_Cleaned', 'BSE_Master', 'BSE_Master_Cleaned'}
        summary = []
        table_sources = {
            'nse_symbols': nse_loaded_count,
            'bse_symbols': bse_loaded_count,
            'bse_metadata': bsemeta_loaded_count,
            'All_Nifty_Indices_Meta_Data': nifty_count,
            'All_BSE_Indices_Meta_Data': bse_indices_count
        }

        for tbl in all_tables:
            if tbl in skip_virtuals:
                continue
            try:
                loaded = table_sources.get(tbl, 'N/A')
                written = con.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
                total_rows = written  # Individual table total rows
                summary.append([tbl, loaded, written, total_rows, today_str])
            except Exception as e:
                summary.append([tbl, loaded, f"Error: {e}", "Error", today_str])

    # --- Write to Excel if triggered ---
    if write_excel:
        try:
            wb = xw.Book.caller()
            sht = wb.sheets["Update Dash board"]
            sht.range("H2").value = [["Table", "Loaded Count", "Written Count", "Total Rows", "Updated Date"]] + summary
        except Exception as e:
            print("\n[Excel output skipped: not run from Excel or sheet missing.]")

if __name__ == "__main__":
    # For standalone Python/terminal runs, skip Excel output:
    update_symbol_db(write_excel=False)
