import duckdb
import pandas as pd
import xlwings as xw
import numpy as np
from pathlib import Path

# --- Dynamic project root finder ---
def find_project_root(marker="rubikview.xlsm"):
    curr = Path(__file__).resolve()
    for parent in [curr.parent] + list(curr.parents):
        if (parent / marker).exists():
            return parent
    raise FileNotFoundError(f"Could not find {marker} in any parent directory of {curr}")

def classify_signal(score, min_score, max_score):
    if max_score == min_score:
        norm_val = 0
    else:
        norm_val = (score - min_score) / (max_score - min_score) * 20 - 10
    if norm_val >= 7:
        sig = "Extreem Bullish ⬆️⬆️ "
    elif norm_val >= 3:
        sig = "Bullish⬆️"
    elif norm_val > -3:
        sig = "Hold ↔️"
    elif norm_val > -7:
        sig = "Bearish ⬇️"
    else:
        sig = "Extreem Bearish ⬇️⬇️"
    return round(norm_val, 2), sig

# --- Robust NSE Mapping using Master Data ---
def get_nse_symbol_map(symbols_db):
    nse_map = {}
    with duckdb.connect(str(symbols_db), read_only=True) as con:
        nse_df = con.execute("""
            SELECT SYMBOL, "COMPANY_NAME"
            FROM NSE_Master_Cleaned
            WHERE SYMBOL IS NOT NULL AND "COMPANY_NAME" IS NOT NULL
        """).fetchdf()
        for _, row in nse_df.iterrows():
            symbol = str(row['SYMBOL']).strip().upper()
            cname = str(row['COMPANY_NAME']).strip()
            nse_map[symbol] = cname
    return nse_map

# --- Robust BSE Mapping using Master Data ---
def get_bse_symbol_map(symbols_db):
    bse_map = {}
    with duckdb.connect(str(symbols_db), read_only=True) as con:
        bse_df = con.execute("""
            SELECT SYMBOL_NAME, COMPANY_NAME
            FROM BSE_Master_Cleaned
            WHERE SYMBOL_NAME IS NOT NULL AND COMPANY_NAME IS NOT NULL
        """).fetchdf()
        for _, row in bse_df.iterrows():
            code = str(row['SYMBOL_NAME']).strip().upper()
            cname = str(row['COMPANY_NAME']).strip()
            bse_map[code] = cname
    return bse_map

# --- Universal Symbol Resolver ---
def resolve_name(symbol, nse_map, bse_map):
    sym = str(symbol).strip().upper()
    if sym.endswith('.NS'):
        base = sym[:-3]
        return nse_map.get(base, "") or ""
    elif sym.endswith('.BO'):
        base = sym[:-3]
        return bse_map.get(base, "") or bse_map.get(sym, "") or ""
    else:
        return nse_map.get(sym, "") or bse_map.get(sym, "") or ""

# --- Filter symbols by exact INDEX_NAME and/or INDUSTRY ---
def get_symbols_by_filter(index_name, industry_name, symbols_db):
    symbols = {}
    with duckdb.connect(str(symbols_db), read_only=True) as con:
        tables = [x[0] for x in con.execute("SHOW TABLES").fetchall()]
        # NSE
        if "NSE_Master_Cleaned" in tables:
            nse_query = "SELECT SYMBOL, INDEX_NAME, INDUSTRY FROM NSE_Master_Cleaned WHERE SYMBOL IS NOT NULL"
            params = []
            if index_name:
                nse_query += " AND TRIM(INDEX_NAME) = ?"
                params.append(index_name.strip())
            if industry_name:
                nse_query += " AND TRIM(INDUSTRY) = ?"
                params.append(industry_name.strip())
            nse_df = con.execute(nse_query, params).fetchdf() if params else con.execute(nse_query).fetchdf()
            for _, row in nse_df.iterrows():
                sym = f"{row['SYMBOL'].strip().upper()}.NS"
                symbols[sym] = {"INDEX": row.get('INDEX_NAME', "").strip() if pd.notnull(row.get('INDEX_NAME', "")) else "",
                                "INDUSTRY": row.get('INDUSTRY', "").strip() if pd.notnull(row.get('INDUSTRY', "")) else ""}
        # BSE
        if "BSE_Master_Cleaned" in tables:
            bse_query = "SELECT SYMBOL_NAME, INDEX_NAME, INDUSTRY FROM BSE_Master_Cleaned WHERE SYMBOL_NAME IS NOT NULL"
            params = []
            if index_name:
                bse_query += " AND TRIM(INDEX_NAME) = ?"
                params.append(index_name.strip())
            if industry_name:
                bse_query += " AND TRIM(INDUSTRY) = ?"
                params.append(industry_name.strip())
            bse_df = con.execute(bse_query, params).fetchdf() if params else con.execute(bse_query).fetchdf()
            for _, row in bse_df.iterrows():
                sym = f"{row['SYMBOL_NAME'].strip().upper()}.BO"
                symbols[sym] = {"INDEX": row.get('INDEX_NAME', "").strip() if pd.notnull(row.get('INDEX_NAME', "")) else "",
                                "INDUSTRY": row.get('INDUSTRY', "").strip() if pd.notnull(row.get('INDUSTRY', "")) else ""}
    return symbols  # Dict: symbol -> {"INDEX": ..., "INDUSTRY": ...}

def main():
    # ---- Dynamic Path Setup ----
    PROJECT_ROOT = find_project_root()
    SIGNALS_DB = PROJECT_ROOT / "Data" / "Signals Data" / "signals.duckdb"
    SYMBOLS_DB = PROJECT_ROOT / "Data" / "Symbols Data" / "symbols.duckdb"
    EXCEL_PATH = PROJECT_ROOT / "rubikview.xlsm"
    INDICATOR_SHEET = "Indicators"
    OUTPUT_SHEET = "Auto Stock Selection"

    wb = xw.Book.caller()
    ind_sheet = wb.sheets[INDICATOR_SHEET]
    out_sheet = wb.sheets[OUTPUT_SHEET]

    out_sheet.range("N4").value = "Top N"
    out_sheet.range("N5").value = "INDEX"
    out_sheet.range("N6").value = "INDUSTRY"
    out_sheet.range("N8").value = "INDICATORS"
    out_sheet.range("N4").api.Font.Bold = True
    out_sheet.range("N8").api.Font.Bold = True
    
    try:
        n_picks = int(out_sheet.range("O4").value)
        if n_picks <= 0:
            n_picks = 10
    except:
        n_picks = 10

    # --- Get filter input from O5 (INDEX) and O6 (INDUSTRY) ---
    index_filter = out_sheet.range("O5").value
    industry_filter = out_sheet.range("O6").value
    index_filter = str(index_filter).strip() if index_filter and str(index_filter).strip() else None
    industry_filter = str(industry_filter).strip() if industry_filter and str(industry_filter).strip() else None

    if index_filter or industry_filter:
        filter_syms_dict = get_symbols_by_filter(index_filter, industry_filter, SYMBOLS_DB)
        filter_syms = set(filter_syms_dict.keys())
    else:
        filter_syms_dict = {}
        filter_syms = None  # No filter, show all

    # --- Load only active indicators ---
    ind_df = ind_sheet.range("A1").options(pd.DataFrame, header=1, index=False, expand='table').value
    ind_df.columns = ind_df.columns.str.strip().str.lower()
    col_active = [col for col in ind_df.columns if 'active' in col][0]
    col_name = [col for col in ind_df.columns if 'indicator' in col and 'name' in col][0]
    col_weight = [col for col in ind_df.columns if 'weight' in col and 'manual' in col][0]
    active = ind_df[ind_df[col_active].str.upper() == 'Y']
    weights = dict(zip(active[col_name], active[col_weight]))

    # --- Indicator count and categories summary ---
    out_sheet.range("O13").value = len(active)
    out_sheet.range("N13").value = "Total"
    categories = active['category'].dropna().unique()
    category_counts = active['category'].value_counts()
    for idx, cat in enumerate(categories):
        n_row = 9 + idx
        out_sheet.range(f"N{n_row}").value = cat
        out_sheet.range(f"O{n_row}").value = int(category_counts[cat])

    # --- Fetch latest signals (only for active indicators) ---
    with duckdb.connect(str(SIGNALS_DB), read_only=True) as con:
        cols = con.execute("PRAGMA table_info('signals')").fetchdf()
        act_sig_cols = [
            indicator.lower().replace(" ", "_").replace("%", "pct") + "_signal"
            for indicator in weights
        ]
        act_sig_cols = [c for c in act_sig_cols if c in cols['name'].values]
        select_cols = ['symbol', 'date'] + act_sig_cols
        if not act_sig_cols:
            out_sheet.range("A:G").clear_contents()
            out_sheet.range("A1").options(index=False).value = [["Name", "Symbol", "Score", "Signal Range (-10 to 10)", "Signal Text", "INDEX", "INDUSTRY"]]
            print("No active indicator signals found in DB!")
            return
        df = con.execute(f"SELECT {', '.join(select_cols)} FROM signals").fetchdf()
        # --- Filter by symbol if filter is used ---
        if filter_syms is not None and not df.empty:
            df = df[df['symbol'].isin(filter_syms)]

    df = df.sort_values('date').groupby('symbol').tail(1).reset_index(drop=True)

    # --- Compute scores using only active indicator columns ---
    score_list = []
    for _, row in df.iterrows():
        symbol = row['symbol']
        if filter_syms is not None and symbol not in filter_syms:
            continue  # Skip symbols not in the selected set
        total_score = 0
        for indicator, weight in weights.items():
            ind_key = indicator.lower().replace(" ", "_").replace("%", "pct") + "_signal"
            signal = row.get(ind_key, None)
            if signal is None or pd.isnull(signal):
                continue
            try:
                score = float(signal) * float(weight)
                total_score += score
            except:
                continue
        index_val = filter_syms_dict.get(symbol, {}).get("INDEX", "") if filter_syms_dict else ""
        industry_val = filter_syms_dict.get(symbol, {}).get("INDUSTRY", "") if filter_syms_dict else ""
        score_list.append({'Symbol': symbol, 'Score': total_score, 'INDEX': index_val, 'INDUSTRY': industry_val})

    score_df = pd.DataFrame(score_list)
    if score_df.empty:
        out_sheet.range("A:G").clear_contents()
        out_sheet.range("A1").options(index=False).value = [["Name", "Symbol", "Score", "Signal Range (-10 to 10)", "Signal Text", "INDEX", "INDUSTRY"]]
        print("No scores computed.")
        return

    # --- Normalize and assign signal text ---
    score_min = score_df['Score'].min()
    score_max = score_df['Score'].max()
    norm_vals, signal_texts = [], []
    for s in score_df['Score']:
        norm, sig = classify_signal(s, score_min, score_max)
        norm_vals.append(norm)
        signal_texts.append(sig)
    score_df['Signal Range (-10 to 10)'] = norm_vals
    score_df['Signal Text'] = signal_texts

    # --- Add Name column using robust mapping ---
    nse_map = get_nse_symbol_map(SYMBOLS_DB)
    bse_map = get_bse_symbol_map(SYMBOLS_DB)
    score_df['Name'] = score_df['Symbol'].apply(lambda s: resolve_name(s, nse_map, bse_map))

    # --- Sort by abs value of normalized score, pick top N ---
    score_df['abs_score'] = score_df['Signal Range (-10 to 10)'].abs()
    topn = score_df.sort_values('abs_score', ascending=False).head(n_picks)
    topn = topn[['Name', 'Symbol', 'Score', 'Signal Range (-10 to 10)', 'Signal Text', 'INDEX', 'INDUSTRY']]

    # --- Output to sheet (columns A-G) ---
    out_sheet.range("A:G").clear_contents()
    out_sheet.range("A1").options(index=False).value = topn

if __name__ == "__main__":
    xw.Book("rubikview.xlsm").set_mock_caller()
    main()
