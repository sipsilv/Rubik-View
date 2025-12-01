import duckdb
import xlwings as xw
from pathlib import Path

def find_project_root(marker="rubikview.xlsm"):
    curr = Path(__file__).resolve()
    for parent in [curr.parent] + list(curr.parents):
        if (parent / marker).exists():
            return parent
    raise FileNotFoundError(f"Could not find {marker} in any parent directory of {curr}")

def refresh_dropdown_lists():
    PROJECT_ROOT = find_project_root()
    SYMBOLS_DB = PROJECT_ROOT / "Data" / "Symbols Data" / "symbols.duckdb"
    EXCEL_PATH = PROJECT_ROOT / "rubikview.xlsm"
    OUTPUT_SHEET = "Auto Stock Selection"  # Change if needed

    wb = xw.Book.caller()
    sht = wb.sheets[OUTPUT_SHEET]

    with duckdb.connect(str(SYMBOLS_DB), read_only=True) as con:
        # INDEX
        nse_index = con.execute("SELECT DISTINCT TRIM(INDEX_NAME) as val FROM NSE_Master_Cleaned WHERE INDEX_NAME IS NOT NULL").fetchdf()
        bse_index = con.execute("SELECT DISTINCT TRIM(INDEX_NAME) as val FROM BSE_Master_Cleaned WHERE INDEX_NAME IS NOT NULL").fetchdf()
        all_index = sorted(set(nse_index['val'].dropna().tolist() + bse_index['val'].dropna().tolist()))
        # INDUSTRY
        nse_industry = con.execute("SELECT DISTINCT TRIM(INDUSTRY) as val FROM NSE_Master_Cleaned WHERE INDUSTRY IS NOT NULL").fetchdf()
        bse_industry = con.execute("SELECT DISTINCT TRIM(INDUSTRY) as val FROM BSE_Master_Cleaned WHERE INDUSTRY IS NOT NULL").fetchdf()
        all_industry = sorted(set(nse_industry['val'].dropna().tolist() + bse_industry['val'].dropna().tolist()))

    # Place INDEX list in AA2:AA..., header AA1 = "INDEX_LIST"
    sht.range("AA1").value = "INDEX_LIST"
    sht.range("AA2").options(transpose=True).value = all_index
    # Place INDUSTRY list in AB2:AB..., header AB1 = "INDUSTRY_LIST"
    sht.range("AB1").value = "INDUSTRY_LIST"
    sht.range("AB2").options(transpose=True).value = all_industry

    # Optionally, you can hide columns AA and AB in Excel UI:
    sht.range("AA:AB").api.EntireColumn.Hidden = True

    print(f"✅ Refreshed dropdown lists: {len(all_index)} index, {len(all_industry)} industry values.")

if __name__ == "__main__":
    xw.Book("rubikview.xlsm").set_mock_caller()
    refresh_dropdown_lists()
