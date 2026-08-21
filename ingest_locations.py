import duckdb
import sqlite3
import os
import time

DATA_DIR = "data"
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

DB_PATH = os.path.join(DATA_DIR, "locations.db")
LGD_PATH = r"c:\Users\ommli\OneDrive\Desktop\tech\HazardLens\dataset\lgd_villages.parquet"
PMGSY_PATH = r"c:\Users\ommli\OneDrive\Desktop\tech\HazardLens\dataset\pmgsy_roads.parquet"

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

print("Connecting to SQLite...")
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Create table
cur.execute('''
CREATE TABLE locations (
    id TEXT PRIMARY KEY,
    source TEXT,
    name TEXT,
    alternate_name TEXT,
    state TEXT,
    district TEXT,
    subdistrict TEXT,
    block TEXT,
    lat REAL,
    lon REAL,
    feature_type TEXT,
    source_id TEXT,
    display_name TEXT
)
''')

# Create FTS5 virtual table
cur.execute('''
CREATE VIRTUAL TABLE locations_fts USING fts5(
    name, alternate_name, state, district, subdistrict, block,
    content='locations',
    content_rowid='rowid'
)
''')

# Create triggers to keep FTS in sync
cur.executescript('''
CREATE TRIGGER locations_ai AFTER INSERT ON locations BEGIN
  INSERT INTO locations_fts(rowid, name, alternate_name, state, district, subdistrict, block) 
  VALUES (new.rowid, new.name, new.alternate_name, new.state, new.district, new.subdistrict, new.block);
END;
''')

print("Reading datasets with DuckDB...")
ddb = duckdb.connect(':memory:')

# LGD Query
# We use (xmin+xmax)/2 as a safe bounding-box centroid fallback since native DuckDB spatial ST_Centroid requires the spatial extension.
query_lgd = f"""
SELECT 
    'LGD_' || OBJECTID as id,
    'LGD' as source,
    vilname11 as name,
    vilnam_soi as alternate_name,
    stname as state,
    dtname as district,
    sdtname as subdistrict,
    block_name as block,
    (ymin + ymax) / 2.0 as lat,
    (xmin + xmax) / 2.0 as lon,
    'village' as feature_type,
    CAST(vil_lgd AS TEXT) as source_id,
    COALESCE(vilname11, vilnam_soi) || COALESCE(', ' || dtname, '') || COALESCE(', ' || stname, '') as display_name
FROM read_parquet('{LGD_PATH}')
"""

print("Extracting LGD...")
t0 = time.time()
res_lgd = ddb.execute(query_lgd).fetchall()
print(f"Inserting {len(res_lgd)} LGD records...")
cur.executemany('''
INSERT OR IGNORE INTO locations (id, source, name, alternate_name, state, district, subdistrict, block, lat, lon, feature_type, source_id, display_name)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', res_lgd)
conn.commit()
print(f"LGD inserted in {time.time()-t0:.2f}s")

# PMGSY Query
# Inserting the full RoadName but setting feature_type to 'road_landmark' to ensure lower ranking.
# PMGSY does not have state/district names directly in text, so we leave state and district empty or map them if available.
# FTS5 will automatically tokenize the RoadName (e.g., "Gandhi Chowk to Khemisati" becomes searchable by "Gandhi").
query_pmgsy = f"""
SELECT 
    'PMGSY_' || ER_ID as id,
    'PMGSY' as source,
    RoadName as name,
    NULL as alternate_name,
    NULL as state,
    NULL as district,
    NULL as subdistrict,
    NULL as block,
    (ymin + ymax) / 2.0 as lat,
    (xmin + xmax) / 2.0 as lon,
    'road_landmark' as feature_type,
    CAST(ER_ID AS TEXT) as source_id,
    RoadName || ' (Road)' as display_name
FROM read_parquet('{PMGSY_PATH}')
WHERE RoadName IS NOT NULL AND RoadName != ''
"""

print("Extracting PMGSY...")
t0 = time.time()
res_pmgsy = ddb.execute(query_pmgsy).fetchall()
print(f"Inserting {len(res_pmgsy)} PMGSY records...")
cur.executemany('''
INSERT OR IGNORE INTO locations (id, source, name, alternate_name, state, district, subdistrict, block, lat, lon, feature_type, source_id, display_name)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', res_pmgsy)
conn.commit()
print(f"PMGSY inserted in {time.time()-t0:.2f}s")

print("Creating indexes on feature_type...")
cur.execute("CREATE INDEX idx_locations_feature_type ON locations(feature_type)")
conn.commit()
conn.close()
print("Database ingestion complete!")
