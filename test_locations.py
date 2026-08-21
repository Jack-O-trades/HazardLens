import sqlite3
import os

DB_PATH = os.path.join("data", "locations.db")
conn = sqlite3.connect(DB_PATH)

queries = [
    "Jajpur",
    "Bhadrak",
    "Paradip",
    "Gandhi",
    "Gandhi Chowk",
    "Assam",
    "Motorangapal"
]

def search(term):
    print(f"\n==============================")
    print(f"SEARCH: '{term}'")
    print(f"==============================")
    
    # Split term into tokens for FTS5 contextual search
    tokens = term.split()
    # Simple prefix matching for each token
    fts_terms = " AND ".join([f'"{t}"*' if ' ' in t else f"{t}*" for t in tokens])
    
    q = f"""
    SELECT l.display_name, l.feature_type, l.source, l.lat, l.lon, l.state, l.district
    FROM locations_fts f
    JOIN locations l ON f.rowid = l.rowid
    WHERE locations_fts MATCH ?
    ORDER BY 
        CASE WHEN l.feature_type = 'village' THEN 0 ELSE 1 END,
        rank
    LIMIT 10
    """
    try:
        cur = conn.cursor()
        cur.execute(q, (fts_terms,))
        rows = cur.fetchall()
        if not rows:
            print("  No results found. (If 'Motorangapal', note: Motorangapal not present in current LGD/PMGSY source data.)")
        else:
            for idx, r in enumerate(rows, 1):
                name, ftype, source, lat, lon, state, district = r
                print(f"  {idx}. {name} | Type: {ftype} | Source: {source} | Lat/Lon: {lat},{lon}")
    except Exception as e:
        print(f"Error: {e}")

for q in queries:
    search(q)

conn.close()
