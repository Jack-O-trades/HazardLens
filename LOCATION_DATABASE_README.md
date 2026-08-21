# HazardLens Location Database

This directory contains the script and instructions for generating the offline SQLite location database used by HazardLens for fast, local geolocation searches.

## Input Datasets
- **LGD Villages (`lgd_villages.parquet`)**: Contains ~584k official revenue villages from the Local Government Directory.
- **PMGSY Roads (`pmgsy_roads.parquet`)**: Contains ~1.1M rural roads linking habitations.

## Schema
The database uses a flattened schema in the `locations` table:
- `id` (TEXT): Unique ID (Source + Original ID)
- `source` (TEXT): 'LGD' or 'PMGSY'
- `name` (TEXT): Primary name of the location
- `alternate_name` (TEXT): Local or alternate name (e.g., SOI name)
- `state` (TEXT): State name or ID
- `district` (TEXT): District name or ID
- `subdistrict` (TEXT): Subdistrict name
- `block` (TEXT): Block name
- `lat` (REAL): Computed latitude
- `lon` (REAL): Computed longitude
- `feature_type` (TEXT): 'village' or 'road_landmark'
- `source_id` (TEXT): Original identifier
- `display_name` (TEXT): Pre-formatted string for UI display

## Coordinate Derivation
Neither dataset provides native point coordinates. 
Instead of requiring expensive spatial polygon conversion, we safely derive representative centroids using the pre-computed bounding boxes in the datasets:
- `Latitude` = `(ymin + ymax) / 2.0`
- `Longitude` = `(xmin + xmax) / 2.0`

## FTS5 Index & Search Ranking
A SQLite Full Text Search (FTS5) virtual table named `locations_fts` keeps an index of all text fields.
The search engine ranks results by:
1. **Feature Type**: LGD `village` matches always rank higher than PMGSY `road_landmark` matches.
2. **FTS Rank**: SQLite's native BM25 rank algorithm determines contextual relevance.
   Multi-token prefix searches (e.g., `Gandhi* AND Chowk* AND Jajpur*`) correctly contextualize locations.

## PMGSY Limitations
The PMGSY dataset contains road segments (e.g., "Gandhi Chowk to Khemisati") rather than discrete point habitations.
To prevent database bloat and indexing errors, we ingest these raw strings as `road_landmark` features without complex NLP splitting. They function as a fallback when official LGD villages are missing.

## How to Rebuild the Database
If datasets change, you can completely rebuild the database:
1. Ensure `lgd_villages.parquet` and `pmgsy_roads.parquet` are inside `dataset/`.
2. Run `python ingest_locations.py`
3. The new database will be saved to `data/locations.db`.
