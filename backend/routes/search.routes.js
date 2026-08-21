import { Router } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// backend/routes is where this file is. The db is at ../../data/locations.db
const dbPath = path.resolve(__dirname, '../../data/locations.db');
let db;
try {
  db = new Database(dbPath, { readonly: true });
} catch (err) {
  console.warn('Failed to open locations.db. Location search will return empty.', err.message);
}

const router = Router();

// Prepare statement conditionally
let searchStmt;
if (db) {
  searchStmt = db.prepare(`
      SELECT 
        l.id, l.name, l.display_name, l.lat, l.lon, 
        l.state, l.district, l.subdistrict, l.block, 
        l.source, l.feature_type
      FROM locations_fts f
      JOIN locations l ON f.rowid = l.rowid
      WHERE locations_fts MATCH ?
      ORDER BY 
          CASE WHEN l.feature_type = 'village' THEN 0 ELSE 1 END,
          rank
      LIMIT 10
  `);
}

router.get('/', (req, res) => {
    const q = req.query.q || '';
    const trimmed = q.trim();

    if (!trimmed || !db) {
        return res.json({
            query: q,
            results: []
        });
    }

    // Clean query to avoid FTS5 syntax errors
    const cleanQuery = trimmed.replace(/[^\w\s]/gi, '');
    const tokens = cleanQuery.split(/\s+/).filter(t => t.length > 0);
    
    if (tokens.length === 0) {
        return res.json({ query: q, results: [] });
    }

    const ftsTerm = tokens.map(t => `${t}*`).join(' AND ');

    try {
        const results = searchStmt.all(ftsTerm);
        res.json({
            query: q,
            results
        });
    } catch (err) {
        console.error('Search API FTS error:', err.message);
        res.json({
            query: q,
            results: []
        });
    }
});

export default router;
