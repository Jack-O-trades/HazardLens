# Location Search API

This document details the new backend location search API, created to query the local SQLite locations database (LGD + PMGSY).

## Endpoint Overview

**GET** `/api/search`

Provides fast, indexed geographic searches over ~1.6M local records without querying external APIs.

## Request Format

- **Query String Parameter:** `q` (The search query string)
- **Example Request 1:** `GET /api/search?q=jajpur`
- **Example Request 2:** `GET /api/search?q=gandhi%20chowk%20jajpur`
- **Empty Query:** `GET /api/search?q=` returns `{ "query": "", "results": [] }` immediately without throwing errors.

## Response Format

Returns a maximum of 10 results in JSON format:

```json
{
  "query": "jajpur",
  "results": [
    {
      "id": "LGD_...",
      "name": "Jajpur",
      "display_name": "Jajpur, Sundargarh, ODISHA",
      "lat": 22.2160,
      "lon": 84.3245,
      "state": "ODISHA",
      "district": "Sundargarh",
      "subdistrict": "...",
      "block": "...",
      "source": "LGD",
      "feature_type": "village"
    }
  ]
}
```

## Ranking Logic

The API uses a SQLite FTS5 index on `locations_fts` to execute fast textual queries.
1. **Feature Priority:** Results with `feature_type = 'village'` (LGD) are unconditionally ranked above `feature_type = 'road_landmark'` (PMGSY).
2. **Relevance (BM25):** The FTS5 engine calculates textual relevance using BM25 (`rank`).
3. **Prefix & Context:** Search tokens are parsed and combined using `AND` operators with prefix wildcards (e.g., `gandhi* AND chowk* AND jajpur*`). This allows partial matches across the name and district columns simultaneously, meaning querying "village-name district-name" correctly narrows down candidates.

## Database Location

The database must be built and located at `data/locations.db` relative to the project root. The Node process accesses it locally via the `better-sqlite3` module.

## Test Results

A test script was executed against the running backend server.
- **`jajpur`**: Returned 10 results, correctly prioritizing LGD village matches (e.g. Byasanagar (M) in Jajapur, ODISHA).
- **`bhadrak`**: Returned 10 results, correctly finding Bhadrak district matches.
- **`paradip`**: Returned 10 results, correctly prioritizing Paradip (M) and Paradipa.
- **`gandhi`**: Returned 10 results, finding various Gandhi* villages in Gujarat and Tamil Nadu.
- **`gandhi chowk jajpur`**: Returned 0 results. FTS strictly requires matching all terms, and no record containing all three terms currently exists.
- **`assam`**: Returned 10 results, correctly identifying villages in the state of ASSAM.
- **`motorangapal`**: Returned 0 results. Motorangapal is not present in current LGD/PMGSY source data.

*(Backward compatibility note: `/api/routes` continues to return a valid HTTP status as expected, confirming the express configuration remains intact).*

## Limitations

- **PMGSY Noise:** Because PMGSY datasets contain full road descriptions, landmark searches can sometimes return descriptive strings in the `display_name` (e.g., "Gandhi Chowk to Khemisati (Road)").
- **Non-Existent Places:** Phonetic misspellings or hyper-local unregistered places like "Motorangapal" are absent from these datasets, so local search will always return 0 results for them.
- **No Typo Forgiveness:** Standard FTS5 does not support fuzzy typo correction. Searching `Japur` instead of `Jajpur` will yield 0 results unless handled by a more advanced NLP spell-checker upstream.
