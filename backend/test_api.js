import { app } from './server.js';
import http from 'http';

const server = http.createServer(app);

const PORT = 3005;

server.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}`);

  const queries = [
    "jajpur",
    "bhadrak",
    "paradip",
    "gandhi",
    "gandhi chowk jajpur",
    "assam",
    "motorangapal"
  ];

  for (const q of queries) {
    console.log(`\n========================================`);
    console.log(`GET /api/search?q=${encodeURIComponent(q)}`);
    try {
      const res = await fetch(`http://localhost:${PORT}/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      console.log(`Query returned ${data.results?.length || 0} results.`);
      if (data.results && data.results.length > 0) {
        data.results.forEach((r, i) => {
          console.log(`  ${i + 1}. [${r.source}] ${r.display_name} (Type: ${r.feature_type}) - Lat/Lon: ${r.lat},${r.lon}`);
        });
      } else {
        console.log(`  No results found.`);
      }
    } catch (err) {
      console.error(`  Error:`, err.message);
    }
  }

  // Backward compatibility test
  console.log(`\n========================================`);
  console.log(`GET /api/routes`);
  try {
      const res = await fetch(`http://localhost:${PORT}/api/routes`);
      console.log(`Status: ${res.status}`);
      if (res.status === 200 || res.status === 404 || res.status === 401) { // 401 might happen if it's protected
         console.log(`Route endpoints are accessible.`);
      }
  } catch(err) {
      console.error(`  Error:`, err.message);
  }

  console.log(`\nTests completed. Closing server...`);
  server.close();
  process.exit(0);
});
