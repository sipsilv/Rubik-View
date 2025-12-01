import duckdb
con = duckdb.connect("Rubik_view/Data/Training Data/training_data.duckdb")
rows = con.execute("SELECT COUNT(*) FROM training_data").fetchall()
print(rows)  # Should show [(non-zero number,)]
