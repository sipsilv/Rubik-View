"""
One-time migration: load all indicators from the Excel 'Indicators' sheet
into the SQLite indicator_configs table.

Run:
    python migrate_indicators_from_excel.py
"""

import os
import sqlite3
from pathlib import Path

import pandas as pd

from backend.core.config import settings


def find_project_root(marker: str = "rubikview.xlsm") -> Path:
    curr = Path(__file__).resolve()
    for parent in [curr.parent] + list(curr.parents):
        if (parent / marker).exists():
            return parent
    raise FileNotFoundError(f"Could not find {marker} in any parent directory of {curr}")


def main() -> None:
    root = find_project_root()
    excel_file = root / "rubikview.xlsm"
    sheet_name = "Indicators"
    db_path = Path(settings.BASE_DIR) / "rubikview_users.db"

    print(f"Project root: {root}")
    print(f"Excel file:   {excel_file}")
    print(f"DB path:      {db_path}")

    if not excel_file.exists():
        print("❌ Excel file not found. Nothing to migrate.")
        return

    # Read Excel sheet into DataFrame
    print("Reading Excel indicators sheet...")
    ind_df = pd.read_excel(
        excel_file,
        sheet_name=sheet_name,
        engine="openpyxl",
    )

    required_cols = [
        "Indicator_Name",
        "Active",
        "Parameter_1",
        "Parameter_2",
        "Parameter_3",
        "Manual_Weight",
        "Use_AI_Weight",
        "AI_Latest_Weight",
    ]
    missing = [c for c in required_cols if c not in ind_df.columns]
    if missing:
        print(f"❌ Missing expected columns in Excel: {missing}")
        return

    # Connect to SQLite DB
    print("Connecting to SQLite...")
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    # Ensure indicator_configs table exists
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS indicator_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            indicator_name VARCHAR NOT NULL,
            active BOOLEAN DEFAULT 1,
            parameter_1 INTEGER,
            parameter_2 INTEGER,
            parameter_3 INTEGER,
            manual_weight VARCHAR,
            use_ai_weight BOOLEAN DEFAULT 0,
            ai_latest_weight VARCHAR,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    conn.commit()

    # Upsert each row from Excel
    created = 0
    updated = 0

    for _, row in ind_df.iterrows():
        name = str(row["Indicator_Name"]).strip()
        if not name:
            continue

        active_flag = str(row["Active"]).strip().upper() == "Y"

        def to_int(val):
            try:
                return int(val)
            except Exception:
                return None

        p1 = to_int(row["Parameter_1"])
        p2 = to_int(row["Parameter_2"])
        p3 = to_int(row["Parameter_3"])

        manual_weight = None
        if pd.notnull(row["Manual_Weight"]):
            manual_weight = str(row["Manual_Weight"]).strip()

        use_ai = str(row["Use_AI_Weight"]).strip().upper() == "Y"

        ai_weight = None
        if pd.notnull(row["AI_Latest_Weight"]):
            ai_weight = str(row["AI_Latest_Weight"]).strip()

        description = None
        if "Description" in ind_df.columns and pd.notnull(row.get("Description")):
            description = str(row["Description"]).strip()

        cur.execute(
            "SELECT id FROM indicator_configs WHERE indicator_name = ?",
            (name,),
        )
        existing = cur.fetchone()

        if existing:
            cur.execute(
                """
                UPDATE indicator_configs
                SET active = ?,
                    description = ?,
                    parameter_1 = ?,
                    parameter_2 = ?,
                    parameter_3 = ?,
                    manual_weight = ?,
                    use_ai_weight = ?,
                    ai_latest_weight = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    1 if active_flag else 0,
                    description,
                    p1,
                    p2,
                    p3,
                    manual_weight,
                    1 if use_ai else 0,
                    ai_weight,
                    existing[0],
                ),
            )
            updated += 1
        else:
            cur.execute(
                """
                INSERT INTO indicator_configs (
                    indicator_name,
                    description,
                    active,
                    parameter_1,
                    parameter_2,
                    parameter_3,
                    manual_weight,
                    use_ai_weight,
                    ai_latest_weight
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    name,
                    description,
                    1 if active_flag else 0,
                    p1,
                    p2,
                    p3,
                    manual_weight,
                    1 if use_ai else 0,
                    ai_weight,
                ),
            )
            created += 1

    conn.commit()
    conn.close()

    print(f"✅ Migration complete. Created: {created}, Updated: {updated}")


if __name__ == "__main__":
    main()


