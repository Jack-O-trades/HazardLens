import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { pipeline } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function ensureLocationDb() {
  const dbPath = path.resolve(__dirname, '../../data/locations.db');
  
  if (fs.existsSync(dbPath)) {
    console.log('Location database found locally');
    return;
  }

  console.log('Location database missing; downloading from S3...');
  
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;
  const key = process.env.LOCATION_DB_S3_KEY;

  if (!region || !bucket || !key) {
    console.warn('⚠ Location database is missing locally and AWS S3 configuration is not set. Continuing in local dev mode.');
    return;
  }

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    const client = new S3Client({ region });
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);
    
    // Stream the response body to the file
    if (response.Body) {
      await pipeline(response.Body, fs.createWriteStream(dbPath));
      console.log('Location database download complete');
    } else {
      throw new Error('S3 object body is empty');
    }
  } catch (error) {
    // If download fails, ensure we don't leave a corrupted partial file
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    throw new Error(`Failed to download location database from S3: ${error.message}`);
  }
}
